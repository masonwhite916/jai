import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, getAuthToken } from '@/lib/api';

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
  const svc = (req.service_type ?? 'battery') as Job['service'];
  return {
    id:            String(j.id),
    service:       svc,
    urgency:       URGENCY_MAP[svc] ?? 'standard',
    status:        j.status as JobStatus,
    customerName:  customer.name ?? 'Customer',
    customerPhone: customer.phone ?? '',
    vehicle: {
      make:  req.vehicle_make  ?? '',
      model: req.vehicle_model ?? '',
      year:  req.vehicle_year  ?? '',
      plate: req.vehicle_plate ?? '',
      color: req.vehicle_color ?? '',
    },
    address:    req.address     ?? '',
    coords: {
      latitude:  req.location_lat ?? 24.7136,
      longitude: req.location_lng ?? 46.6753,
    },
    distanceKm: j.distance_km ?? Math.round(Math.random() * 10 * 10) / 10,
    etaMin:     j.eta_min     ?? Math.round(Math.random() * 20 + 5),
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

export function DriverProvider({ children }: { children: ReactNode }) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    // Load jobs from API (or fallback)
    loadJobs();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem(
        'jai_driver_session',
        JSON.stringify({ driver, activeJob }),
      );
    }
  }, [driver, activeJob, isLoading]);

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

  const refreshJobs = async () => {
    await loadJobs();
  };

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
