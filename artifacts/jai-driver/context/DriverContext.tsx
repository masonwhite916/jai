import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { ApiError, apiFetch, getAuthToken, setAuthToken } from '@/lib/api';
import { jaiSocket } from '@/lib/socket';

// ── Types ─────────────────────────────────────────────────────────────────────

export type JobStatus =
  | 'pending' | 'accepted' | 'en_route' | 'arrived' | 'working' | 'completed' | 'cancelled';

export type ServiceType =
  | 'tow' | 'battery' | 'tire' | 'fuel' | 'lockout' | 'mechanic' | 'electric';

export interface VehicleInfo {
  make: string;
  model: string;
  year: string;
  plate: string;
  color: string;
}

export interface Job {
  id: string;
  service: ServiceType;
  status: JobStatus;
  customerName: string;
  customerPhone: string;
  vehicle: VehicleInfo;
  address: string;
  coords: { latitude: number; longitude: number } | null;
  /** Straight-line distance from the technician, computed client-side. */
  distanceKm?: number;
  etaMin?: number;
  payout: number;
  createdAt: string;
  completedAt: string | null;
  /** True when this job is assigned to the signed-in technician. */
  mine: boolean;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  rating: number;
  jobsCompleted: number;
  isOnline: boolean;
  earnings: { today: number; week: number; month: number; total: number };
}

/** Shape returned by /api/auth/verify-otp and /api/users/me. */
export interface ServerUser {
  id: string;
  phone: string;
  name: string;
  role: string;
  rating: number | null;
  jobsCompleted: number;
  earningsTotal: number;
}

type MutationResult = { ok: true } | { ok: false; status?: number; error: string };

interface DriverContextType {
  driver: Driver | null;
  jobs: Job[];
  activeJob: Job | null;
  isLoading: boolean;
  loadError: string | null;
  login: (user: ServerUser, token: string) => Promise<void>;
  logout: () => Promise<void>;
  toggleOnline: () => void;
  acceptJob: (jobId: string) => Promise<MutationResult>;
  updateJobStatus: (jobId: string, status: JobStatus) => Promise<MutationResult>;
  cancelJob: (jobId: string) => Promise<MutationResult>;
  refreshJobs: () => Promise<void>;
}

// ── Constants / helpers ───────────────────────────────────────────────────────

const TOKEN_KEY   = 'jai_driver_token';
const PROFILE_KEY = 'jai_driver_profile';
const ONLINE_KEY  = 'jai_driver_online';

const ACTIVE_STATUSES: JobStatus[] = ['accepted', 'en_route', 'arrived', 'working'];

interface ServerJobRow {
  id: number;
  request_id?: number;
  technician_id?: number | null;
  status?: JobStatus;
  payout?: number;
  distance_km?: number | null;
  eta_min?: number | null;
  completed_at?: string | null;
  created_at?: string;
  request?: Record<string, unknown> | null;
  customer?: { name?: string | null; phone?: string | null } | null;
  // Flat fields used by the `new_job` WebSocket payload
  service_type?: string;
  address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: string | null;
  vehicle_plate?: string | null;
  vehicle_color?: string | null;
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

function mapServerJob(j: ServerJobRow, myId: number | null): Job {
  const req = (j.request ?? {}) as Record<string, unknown>;
  const service = str(req.service_type ?? j.service_type ?? 'tow') as ServiceType;
  const lat = (req.location_lat ?? j.location_lat) as number | null | undefined;
  const lng = (req.location_lng ?? j.location_lng) as number | null | undefined;

  return {
    id: String(j.id),
    service,
    status: (j.status ?? 'pending') as JobStatus,
    customerName: j.customer?.name || 'Customer',
    customerPhone: j.customer?.phone || '',
    vehicle: {
      make:  str(req.vehicle_make  ?? j.vehicle_make),
      model: str(req.vehicle_model ?? j.vehicle_model),
      year:  str(req.vehicle_year  ?? j.vehicle_year),
      plate: str(req.vehicle_plate ?? j.vehicle_plate),
      color: str(req.vehicle_color ?? j.vehicle_color),
    },
    address: str(req.address ?? j.address),
    coords:
      typeof lat === 'number' && typeof lng === 'number'
        ? { latitude: lat, longitude: lng }
        : null,
    distanceKm: j.distance_km ?? undefined,
    etaMin: j.eta_min ?? undefined,
    payout: j.payout ?? 0,
    createdAt: str(j.created_at || new Date().toISOString()),
    completedAt: j.completed_at ? String(j.completed_at) : null,
    mine: myId != null && j.technician_id === myId,
  };
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// ── Context ───────────────────────────────────────────────────────────────────

const DriverContext = createContext<DriverContextType | null>(null);

export function DriverProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile]     = useState<ServerUser | null>(null);
  const [rawJobs, setRawJobs]     = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [myPos, setMyPos]         = useState<{ lat: number; lng: number } | null>(null);

  const myIdRef = useRef<number | null>(null);
  myIdRef.current = profile ? Number(profile.id) : null;

  // ── Jobs enriched with client-side distance/ETA ────────────────────────────
  const jobs = useMemo<Job[]>(() => {
    if (!myPos) return rawJobs;
    return rawJobs.map((j) => {
      if (!j.coords) return j;
      const dKm = haversineKm(myPos.lat, myPos.lng, j.coords.latitude, j.coords.longitude);
      return {
        ...j,
        distanceKm: Math.round(dKm * 10) / 10,
        etaMin: Math.max(1, Math.round(dKm * 2)),
      };
    });
  }, [rawJobs, myPos]);

  const activeJob = useMemo(
    () => jobs.find((j) => j.mine && ACTIVE_STATUSES.includes(j.status)) ?? null,
    [jobs],
  );

  // ── Earnings derived from completed jobs + server total ───────────────────
  const driver = useMemo<Driver | null>(() => {
    if (!profile) return null;
    const dayMs = 24 * 60 * 60 * 1000;
    const today = startOfToday();
    let sumToday = 0, sumWeek = 0, sumMonth = 0;
    for (const j of rawJobs) {
      if (!j.mine || j.status !== 'completed' || !j.completedAt) continue;
      const ts = new Date(j.completedAt).getTime();
      if (Number.isNaN(ts)) continue;
      if (ts >= today) sumToday += j.payout;
      if (ts >= Date.now() - 7 * dayMs) sumWeek += j.payout;
      if (ts >= Date.now() - 30 * dayMs) sumMonth += j.payout;
    }
    return {
      id: profile.id,
      name: profile.name,
      phone: profile.phone,
      rating: profile.rating ?? 5,
      jobsCompleted: profile.jobsCompleted,
      isOnline,
      earnings: { today: sumToday, week: sumWeek, month: sumMonth, total: profile.earningsTotal },
    };
  }, [profile, rawJobs, isOnline]);

  // ── Data loading ───────────────────────────────────────────────────────────

  const clearSession = useCallback(async () => {
    setAuthToken(null);
    jaiSocket.disconnect();
    setProfile(null);
    setRawJobs([]);
    await AsyncStorage.multiRemove([TOKEN_KEY, PROFILE_KEY]);
  }, []);

  const refreshJobs = useCallback(async () => {
    if (!getAuthToken()) return;
    try {
      const [pendingResp, mineResp] = await Promise.all([
        apiFetch<{ jobs: ServerJobRow[] }>('/api/jobs?status=pending'),
        apiFetch<{ jobs: ServerJobRow[] }>('/api/jobs'),
      ]);
      const myId = myIdRef.current;
      const mine = (mineResp.jobs ?? []).map((j) => mapServerJob(j, myId));
      const mineIds = new Set(mine.map((j) => j.id));
      const pending = (pendingResp.jobs ?? [])
        .map((j) => mapServerJob(j, myId))
        .filter((j) => !mineIds.has(j.id));
      setRawJobs([...pending, ...mine]);
      setLoadError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        void clearSession();
        return;
      }
      setLoadError(err instanceof Error ? err.message : 'Failed to load jobs');
    }
  }, [clearSession]);

  const refreshProfile = useCallback(async () => {
    if (!getAuthToken()) return;
    try {
      const me = await apiFetch<ServerUser>('/api/users/me');
      setProfile(me);
      void AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(me));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        void clearSession();
        return;
      }
      /* otherwise transient — keep the cached profile */
    }
  }, [clearSession]);

  // ── Boot: restore session ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [token, cachedProfile, onlineFlag] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(PROFILE_KEY),
          AsyncStorage.getItem(ONLINE_KEY),
        ]);
        if (onlineFlag === 'false') setIsOnline(false);
        if (!token) return;

        setAuthToken(token);
        if (cachedProfile) {
          try {
            const parsed = JSON.parse(cachedProfile) as ServerUser;
            if (parsed.role === 'technician') setProfile(parsed);
          } catch { /* corrupt cache — ignore */ }
        }

        try {
          const me = await apiFetch<ServerUser>('/api/users/me');
          if (me.role !== 'technician') {
            await clearSession();
            return;
          }
          setProfile(me);
          void AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(me));
          jaiSocket.connect(token);
          await refreshJobs();
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            await clearSession();
          } else {
            // Network hiccup — keep cached session, try socket anyway
            jaiSocket.connect(token);
            setLoadError(err instanceof Error ? err.message : 'Failed to load');
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Session actions ────────────────────────────────────────────────────────

  const login = useCallback(async (user: ServerUser, token: string) => {
    setAuthToken(token);
    // verify-otp omits earningsTotal — normalize, then fetch the full profile
    const safeUser: ServerUser = {
      ...user,
      rating: user.rating ?? null,
      jobsCompleted: user.jobsCompleted ?? 0,
      earningsTotal: user.earningsTotal ?? 0,
    };
    setProfile(safeUser);
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, token),
      AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(safeUser)),
    ]);
    jaiSocket.connect(token);
    myIdRef.current = Number(user.id);
    await refreshJobs();
    void refreshProfile();
  }, [refreshJobs, refreshProfile]);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/users/logout', { method: 'POST' });
    } catch {
      /* best effort — clear locally regardless */
    }
    await clearSession();
  }, [clearSession]);

  const toggleOnline = useCallback(() => {
    setIsOnline((prev) => {
      void AsyncStorage.setItem(ONLINE_KEY, String(!prev));
      return !prev;
    });
  }, []);

  // ── Job mutations ──────────────────────────────────────────────────────────

  const patchJob = useCallback(
    async (jobId: string, status: JobStatus): Promise<MutationResult> => {
      try {
        const updated = await apiFetch<ServerJobRow>(`/api/jobs/${jobId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
        setRawJobs((prev) =>
          prev.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  status: updated.status ?? status,
                  mine: true,
                  completedAt: updated.completed_at
                    ? String(updated.completed_at)
                    : j.completedAt,
                }
              : j,
          ),
        );
        if (status === 'completed') void refreshProfile();
        return { ok: true };
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          void clearSession();
          return { ok: false, status: 401, error: err.message };
        }
        // Board may be stale (e.g. job taken by someone else) — resync
        void refreshJobs();
        if (err instanceof ApiError) {
          return { ok: false, status: err.status, error: err.message };
        }
        return { ok: false, error: err instanceof Error ? err.message : 'Request failed' };
      }
    },
    [refreshJobs, refreshProfile, clearSession],
  );

  const acceptJob = useCallback(
    (jobId: string) => patchJob(jobId, 'accepted'),
    [patchJob],
  );
  const updateJobStatus = useCallback(
    (jobId: string, status: JobStatus) => patchJob(jobId, status),
    [patchJob],
  );
  const cancelJob = useCallback(
    (jobId: string) => patchJob(jobId, 'cancelled'),
    [patchJob],
  );

  // ── Real-time: new jobs appear instantly ───────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    const offNew = jaiSocket.on('new_job', (payload) => {
      const row = payload.job as ServerJobRow | undefined;
      if (!row || typeof row.id !== 'number') return;
      const mapped = mapServerJob(row, myIdRef.current);
      setRawJobs((prev) =>
        prev.some((j) => j.id === mapped.id) ? prev : [mapped, ...prev],
      );
    });
    return offNew;
  }, [profile?.id]);

  // ── Session: socket reports our token is invalid → sign out ───────────────
  useEffect(() => {
    if (!profile) return;
    const off = jaiSocket.on('auth_error', () => { void clearSession(); });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, clearSession]);

  // ── Real-time: follow status of my active job (dispatch may change it) ─────
  useEffect(() => {
    if (!activeJob) return;
    const room = `job:${activeJob.id}`;
    jaiSocket.joinRoom(room);
    const off = jaiSocket.on('job_status', (payload) => {
      const jobId = String(payload.jobId ?? '');
      const status = payload.status as JobStatus | undefined;
      if (jobId !== activeJob.id || !status) return;
      setRawJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status } : j)),
      );
    });
    return () => {
      off();
      jaiSocket.leaveRoom(room);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeJob?.id]);

  // ── GPS: one-shot fix for distance display ─────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setMyPos({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch {
        /* location unavailable — distances show as “—” */
      }
    })();
    return () => { cancelled = true; };
  }, [profile?.id]);

  // ── GPS: stream location while a job is active ─────────────────────────────
  useEffect(() => {
    if (!activeJob) return;
    const jobId = activeJob.id;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 20,
          },
          (loc) => {
            if (cancelled) return;
            setMyPos({ lat: loc.coords.latitude, lng: loc.coords.longitude });
            jaiSocket.sendLocation(loc.coords.latitude, loc.coords.longitude, jobId);
          },
        );
        if (cancelled) {
          // Effect tore down while the watcher was starting — stop it now
          sub.remove();
          sub = null;
        }
      } catch {
        /* location unavailable — tracking simply pauses */
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [activeJob?.id]);

  // ── Poll the job board while signed in (fallback for missed sockets) ───────
  useEffect(() => {
    if (!profile) return;
    const iv = setInterval(() => { void refreshJobs(); }, 20_000);
    return () => clearInterval(iv);
  }, [profile?.id, refreshJobs]);

  const value: DriverContextType = {
    driver,
    jobs,
    activeJob,
    isLoading,
    loadError,
    login,
    logout,
    toggleOnline,
    acceptJob,
    updateJobStatus,
    cancelJob,
    refreshJobs,
  };

  return <DriverContext.Provider value={value}>{children}</DriverContext.Provider>;
}

export function useDriver() {
  const ctx = useContext(DriverContext);
  if (!ctx) throw new Error('useDriver must be used within DriverProvider');
  return ctx;
}
