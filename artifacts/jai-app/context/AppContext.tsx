import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, setAuthToken, getAuthToken } from '@/lib/api';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: string;
  plate: string;
  color: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  membership: 'none' | 'basic' | 'premium' | 'accidents' | 'rental';
  vehicles: Vehicle[];
  points: number;
}

/** Tracks the customer's most recent active service request for real-time tracking. */
export interface ActiveRequest {
  requestId: string;
  jobId: string;
  serviceType: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  /** Customer's GPS position at time of request submission */
  customerLat?: number;
  customerLng?: number;
  /** Populated once a technician accepts the job via WebSocket event */
  tech?: {
    id: number;
    name: string;
    phone: string;
    rating: number;
  } | null;
  etaMin?: number;
  distanceKm?: number;
  payout?: number;
}

export interface AppNotification {
  id: number;
  user_id: number;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

interface AppContextType {
  isLoading: boolean;
  hasSeenOnboarding: boolean;
  isAuthenticated: boolean;
  user: User | null;
  role: 'customer' | 'technician' | null;
  setRole: (role: 'customer' | 'technician' | null) => Promise<void>;
  markOnboardingDone: () => Promise<void>;
  login: (user: User, token?: string) => Promise<void>;
  loginAsGuest: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  /** Re-fetch the profile from the server (no-op for guests/offline). */
  refreshUser: () => Promise<void>;
  // Active service request (real-time tracking)
  activeRequest: ActiveRequest | null;
  setActiveRequest: (r: ActiveRequest | null) => void;
  // Notifications
  notifications: AppNotification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markNotifRead: (id: number) => Promise<void>;
  markAllNotifsRead: () => Promise<void>;
  /** @deprecated use notifications array instead */
  notifReadIds: string[];
}

const AppContext = createContext<AppContextType | null>(null);

// Fallback for guest/offline usage
export const DEFAULT_USER: User = {
  id: 'guest',
  name: 'Guest',
  phone: '',
  membership: 'none',
  points: 0,
  vehicles: [],
};

interface AppProviderProps {
  children: ReactNode;
  initialSession?: {
    user: User | null;
    hasSeenOnboarding: boolean;
    role: 'customer' | 'technician' | null;
    token?: string | null;
  } | null;
}

export function AppProvider({ children, initialSession }: AppProviderProps) {
  const preloaded = initialSession != null;

  const [isLoading, setIsLoading] = useState(!preloaded);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(
    preloaded ? initialSession.hasSeenOnboarding : false,
  );
  const [isAuthenticated, setIsAuthenticated] = useState(
    preloaded ? initialSession.user !== null : false,
  );
  const [isGuest, setIsGuest] = useState(false);
  const [user, setUser] = useState<User | null>(
    preloaded ? initialSession.user : null,
  );
  const [role, setRoleState] = useState<'customer' | 'technician' | null>(
    preloaded ? initialSession.role : null,
  );
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeRequest, setActiveRequestState] = useState<ActiveRequest | null>(null);

  const isGuestRef = useRef(isGuest);
  useEffect(() => { isGuestRef.current = isGuest; }, [isGuest]);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // Sync module-level token when preloaded session has one
  useEffect(() => {
    if (preloaded && initialSession?.token) {
      setAuthToken(initialSession.token);
    }
  }, []);

  useEffect(() => {
    if (!preloaded) loadState();
  }, []);

  // Re-hydrate on foreground resume
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState !== 'active') return;
      if (userRef.current !== null || isGuestRef.current) return;
      try {
        const [userData, token] = await Promise.all([
          AsyncStorage.getItem('jai_user'),
          AsyncStorage.getItem('jai_token'),
        ]);
        if (token) setAuthToken(token);
        if (userData) {
          setUser(JSON.parse(userData));
          setIsAuthenticated(true);
          setIsGuest(false);
        }
      } catch { /* ignore */ }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, []);

  // Fetch notifications whenever authenticated state is true and token is set
  useEffect(() => {
    if (isAuthenticated && !isGuest && getAuthToken()) {
      fetchNotifications().catch(() => {});
    } else {
      setNotifications([]);
    }
  }, [isAuthenticated, isGuest]);

  async function fetchNotifications() {
    if (!getAuthToken()) return;
    try {
      const resp = await apiFetch<{ notifications: AppNotification[] }>('/api/notifications?limit=50');
      setNotifications(resp.notifications ?? []);
    } catch { /* silently ignore network errors */ }
  }

  async function loadState() {
    try {
      const [onboarding, userData, storedRole, token] = await Promise.all([
        AsyncStorage.getItem('jai_onboarding'),
        AsyncStorage.getItem('jai_user'),
        AsyncStorage.getItem('jai_role'),
        AsyncStorage.getItem('jai_token'),
      ]);

      setHasSeenOnboarding(onboarding === 'true');
      if (storedRole === 'customer' || storedRole === 'technician') {
        setRoleState(storedRole);
      }

      if (token) {
        setAuthToken(token);
        // Try fetching fresh user data from the server
        try {
          const freshUser = await apiFetch<User>('/api/users/me');
          await AsyncStorage.setItem('jai_user', JSON.stringify(freshUser));
          setUser(freshUser);
          setIsAuthenticated(true);
          setIsGuest(false);
          return;
        } catch {
          // Token may have expired — fall back to cached user data
          setAuthToken(null);
          await AsyncStorage.removeItem('jai_token');
        }
      }

      if (userData) {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
        setIsGuest(false);
      }
    } catch { /* ignore */ } finally {
      setIsLoading(false);
    }
  }

  async function setRole(r: 'customer' | 'technician' | null) {
    if (r) await AsyncStorage.setItem('jai_role', r);
    else    await AsyncStorage.removeItem('jai_role');
    setRoleState(r);
  }

  async function markOnboardingDone() {
    await AsyncStorage.setItem('jai_onboarding', 'true');
    setHasSeenOnboarding(true);
  }

  async function login(userData: User, token?: string) {
    if (token) {
      await AsyncStorage.setItem('jai_token', token);
      setAuthToken(token);
    }
    await AsyncStorage.setItem('jai_user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
    setIsGuest(false);
  }

  async function loginAsGuest(userData: User) {
    await AsyncStorage.removeItem('jai_user');
    await AsyncStorage.removeItem('jai_token');
    setAuthToken(null);
    setUser(userData);
    setIsAuthenticated(true);
    setIsGuest(true);
  }

  async function logout() {
    // Invalidate token server-side if we have one
    if (getAuthToken()) {
      try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    }
    setAuthToken(null);
    await Promise.all([
      AsyncStorage.removeItem('jai_user'),
      AsyncStorage.removeItem('jai_token'),
    ]);
    setUser(null);
    setIsAuthenticated(false);
    setIsGuest(false);
    setActiveRequestState(null);
    setNotifications([]);
  }

  async function markNotifRead(id: number) {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n),
    );
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    } catch { /* revert is cosmetic — ignore */ }
  }

  async function markAllNotifsRead() {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await apiFetch('/api/notifications/read-all', { method: 'POST' });
    } catch { /* ignore */ }
  }

  async function updateUser(updates: Partial<User>) {
    if (!user) return;
    const updated = { ...user, ...updates };

    if (!isGuest && getAuthToken()) {
      try {
        const fresh = await apiFetch<User>('/api/users/me', {
          method: 'PUT',
          body: JSON.stringify(updates),
        });
        await AsyncStorage.setItem('jai_user', JSON.stringify(fresh));
        setUser(fresh);
        return;
      } catch { /* fall through to local update */ }
    }

    if (!isGuest) {
      await AsyncStorage.setItem('jai_user', JSON.stringify(updated));
    }
    setUser(updated);
  }

  async function refreshUser() {
    if (!getAuthToken()) return;
    try {
      const fresh = await apiFetch<User>('/api/users/me');
      await AsyncStorage.setItem('jai_user', JSON.stringify(fresh));
      setUser(fresh);
    } catch { /* keep cached user on failure */ }
  }

  function setActiveRequest(r: ActiveRequest | null) {
    setActiveRequestState(r);
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  // Derived legacy list for any component that still reads notifReadIds
  const notifReadIds = notifications.filter(n => n.read).map(n => String(n.id));

  return (
    <AppContext.Provider value={{
      isLoading, hasSeenOnboarding, isAuthenticated, user, role,
      setRole, markOnboardingDone, login, loginAsGuest, logout, updateUser, refreshUser,
      activeRequest, setActiveRequest,
      notifications, unreadCount, fetchNotifications, markNotifRead, markAllNotifsRead,
      notifReadIds,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
