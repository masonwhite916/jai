import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { apiFetch, getAuthToken } from '@/lib/api';
import { jaiSocket } from '@/lib/socket';

export type JobStatus = 'pending' | 'accepted' | 'en_route' | 'arrived' | 'working' | 'completed' | 'cancelled';

export interface VehicleInfo {
  make: string;
  model: string;
  year: string;
  plate: string;
  color: string;
}

export interface Job {
  id: string;
  service: 'tow' | 'battery' | 'tire' | 'fuel' | 'lockout';
  urgency: 'urgent' | 'standard';
  status: JobStatus;
  customerName: string;
  customerPhone: string;
  vehicle: VehicleInfo;
  address: string;
  coords: { latitude: number; longitude: number };
  distanceKm: number;
  etaMin: number;
  payout: number;
  createdAt: string;
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

interface DriverContextType {
  driver: Driver | null;
  jobs: Job[];
  activeJob: Job | null;
  isLoading: boolean;
  login: (driver: Driver) => Promise<void>;
  logout: () => Promise<void>;
  toggleOnline: () => Promise<void>;
  acceptJob: (id: string) => Promise<void>;
  updateJobStatus: (id: string, status: JobStatus) => Promise<void>;
  cancelJob: (id: string) => Promise<void>;
  refreshJobs: () => Promise<void>;
}

const DriverContext = createContext<DriverContextType | null>(null);

export const DEFAULT_DRIVER: Driver = {
  id: 'd1',
  name: 'Ahmed Al-Dossari',
  phone: '+966 55 561 6449',
  rating: 4.8,
  jobsCompleted: 124,
  isOnline: true,
  earnings: { today: 340, week: 1280, month: 5120, total: 18900 },
};

// Transform an API job record into the local Job shape
function apiJobToJob(j: Record<string, any>): Job {
  const req = j.request ?? {};
  const customer = j.customer ?? {};
  const URGENCY_MAP: Record<string, 'urgent' | 'standard'> = {
    tow: 'urgent', fuel: 'urgent', battery: 'urgent',
    tire: 'standard', lockout: 'standard', mechanic: 'standard', electric: 'standard',
  };
  const svc = (req.service_type ?? j.service_type ?? 'battery') as Job['service'];
  return {
    id:            String(j.id),
    service:       svc,
    urgency:       URGENCY_MAP[svc] ?? 'standard',
    status:        j.status as JobStatus,
    customerName:  customer.name ?? 'Customer',
    customerPhone: customer.phone ?? '',
    vehicle: {
      make:  req.vehicle_make  ?? j.vehicle_make  ?? '',
      model: req.vehicle_model ?? j.vehicle_model ?? '',
      year:  req.vehicle_year  ?? j.vehicle_year  ?? '',
      plate: req.vehicle_plate ?? j.vehicle_plate ?? '',
      color: req.vehicle_color ?? j.vehicle_color ?? '',
    },
    address:    req.address     ?? j.address     ?? '',
    coords: {
      latitude:  req.location_lat ?? j.location_lat ?? 24.7136,
      longitude: req.location_lng ?? j.location_lng ?? 46.6753,
    },
    distanceKm: j.distance_km ?? 0,
    etaMin:     j.eta_min     ?? 0,
    payout:     j.payout      ?? 120,
    createdAt:  j.created_at  ?? new Date().toISOString(),
  };
}

const FALLBACK_JOBS: Job[] = [
  {
    id: 'j1', service: 'battery', urgency: 'urgent', status: 'pending',
    customerName: 'Mohammed Al-Rashid', customerPhone: '+966 50 123 4567',
    vehicle: { make: 'Toyota', model: 'Camry', year: '2022', plate: 'ABC 1234', color: 'White' },
    address: 'King Fahd Rd, Al Olaya, Riyadh',
    coords: { latitude: 24.7136, longitude: 46.6753 },
    distanceKm: 2.3, etaMin: 8, payout: 120, createdAt: new Date().toISOString(),
  },
  {
    id: 'j2', service: 'tire', urgency: 'standard', status: 'pending',
    customerName: 'Fahad Al-Harbi', customerPhone: '+966 55 987 6543',
    vehicle: { make: 'Hyundai', model: 'Santa Fe', year: '2020', plate: 'XYZ 9012', color: 'Black' },
    address: 'Anas bin Malik, Al Yasmin, Riyadh',
    coords: { latitude: 24.7456, longitude: 46.6234 },
    distanceKm: 5.7, etaMin: 18, payout: 90, createdAt: new Date().toISOString(),
  },
];

// ── Location permission request (best-effort) ─────────────────────────────────
async function requestLocationPermission() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

async function getCurrentCoords(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
  } catch {
    return null;
  }
}

export function DriverProvider({ children }: { children: ReactNode }) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [jobs, setJobs]       = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Location broadcast interval ref
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeJobRef = useRef<Job | null>(null);
  useEffect(() => { activeJobRef.current = activeJob; }, [activeJob]);
  const driverRef = useRef<Driver | null>(null);
  useEffect(() => { driverRef.current = driver; }, [driver]);

  // ── Startup: load persisted session ───────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem('jai_driver_session').then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setDriver(parsed.driver ?? null);
          setActiveJob(parsed.activeJob ?? null);
        } catch { /* ignore */ }
      }
      setIsLoading(false);
    });
    loadJobs();
  }, []);

  // ── Persist session on change ──────────────────────────────────────────────
  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem(
        'jai_driver_session',
        JSON.stringify({ driver, activeJob }),
      );
    }
  }, [driver, activeJob, isLoading]);

  // ── WebSocket: connect when we have an auth token ─────────────────────────
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    jaiSocket.connect(token);

    // New job broadcast → add to pending queue instantly
    const offNewJob = jaiSocket.on('new_job', (payload) => {
      const raw = payload.job as Record<string, any> | undefined;
      if (!raw) return;
      const job = apiJobToJob(raw);
      setJobs((prev) => {
        // Don't add duplicates
        if (prev.some((j) => j.id === job.id)) return prev;
        return [job, ...prev];
      });
    });

    // Job status changes relayed from the server (for the active job)
    const offJobStatus = jaiSocket.on('job_status', (payload) => {
      const { jobId, status } = payload as { jobId: number; status: string };
      const id = String(jobId);
      setJobs((prev) => prev.map((j) => j.id === id ? { ...j, status: status as JobStatus } : j));
      if (activeJobRef.current?.id === id) {
        setActiveJob((prev) => prev ? { ...prev, status: status as JobStatus } : null);
      }
    });

    return () => {
      offNewJob();
      offJobStatus();
      // Don't disconnect here — may remount; driver must call logout() to fully disconnect
    };
  }, []);

  // ── Reconnect socket on foreground resume ─────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      const token = getAuthToken();
      if (token && !jaiSocket.connected) jaiSocket.connect(token);
    });
    return () => sub.remove();
  }, []);

  // ── Location broadcast: every 10 s while there is an active job ───────────
  useEffect(() => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }

    if (!activeJob || activeJob.status === 'completed' || activeJob.status === 'cancelled') return;

    // Request permission then start the interval
    requestLocationPermission().then((granted) => {
      if (!granted) return;
      locationIntervalRef.current = setInterval(async () => {
        const job = activeJobRef.current;
        if (!job || job.status === 'completed' || job.status === 'cancelled') return;
        const coords = await getCurrentCoords();
        if (!coords) return;
        jaiSocket.sendLocation(coords.latitude, coords.longitude, job.id);
      }, 10_000);
    });

    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
    };
  }, [activeJob?.id, activeJob?.status]);

  // ── Job loading ───────────────────────────────────────────────────────────
  async function loadJobs() {
    const token = getAuthToken();
    if (!token) {
      setJobs(FALLBACK_JOBS);
      return;
    }
    try {
      const data = await apiFetch<{ jobs: Record<string, any>[] }>('/api/jobs?status=pending');
      const mapped = data.jobs.map(apiJobToJob);
      setJobs(mapped.length ? mapped : FALLBACK_JOBS);
    } catch {
      setJobs(FALLBACK_JOBS);
    }
  }

  const login = async (d: Driver) => { setDriver(d); };

  const logout = async () => {
    jaiSocket.disconnect();
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    setDriver(null);
    setActiveJob(null);
    setJobs([]);
    await AsyncStorage.removeItem('jai_driver_session');
  };

  const toggleOnline = async () => {
    if (!driver) return;
    setDriver({ ...driver, isOnline: !driver.isOnline });
  };

  const acceptJob = async (id: string) => {
    const token = getAuthToken();
    if (token) {
      try {
        await apiFetch(`/api/jobs/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'accepted' }),
        });
      } catch { /* best-effort; keep local update */ }
    }
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: 'accepted' } : j)));
    const job = jobs.find((j) => j.id === id);
    if (job) setActiveJob({ ...job, status: 'accepted' });
  };

  const updateJobStatus = async (id: string, status: JobStatus) => {
    const token = getAuthToken();
    if (token) {
      try {
        await apiFetch(`/api/jobs/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
      } catch { /* best-effort */ }
    }
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)));
    if (activeJob?.id === id) {
      const updated = { ...activeJob, status };
      setActiveJob(updated);
      if (status === 'completed' && driver) {
        const payout = updated.payout;
        setDriver({
          ...driver,
          jobsCompleted: driver.jobsCompleted + 1,
          earnings: {
            today:  driver.earnings.today + payout,
            week:   driver.earnings.week  + payout,
            month:  driver.earnings.month + payout,
            total:  driver.earnings.total + payout,
          },
        });
        setActiveJob(null);
      }
    }
  };

  const cancelJob = async (id: string) => {
    const token = getAuthToken();
    if (token) {
      try {
        await apiFetch(`/api/jobs/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'cancelled' }),
        });
      } catch { /* best-effort */ }
    }
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: 'cancelled' } : j)));
    if (activeJob?.id === id) setActiveJob(null);
  };

  const refreshJobs = async () => { await loadJobs(); };

  return (
    <DriverContext.Provider value={{
      driver, jobs, activeJob, isLoading,
      login, logout, toggleOnline, acceptJob, updateJobStatus, cancelJob, refreshJobs,
    }}>
      {children}
    </DriverContext.Provider>
  );
}

export function useDriver() {
  const ctx = useContext(DriverContext);
  if (!ctx) throw new Error('useDriver must be used within DriverProvider');
  return ctx;
}
