import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

interface AppContextType {
  isLoading: boolean;
  hasSeenOnboarding: boolean;
  isAuthenticated: boolean;
  user: User | null;
  role: 'customer' | 'technician' | null;
  setRole: (role: 'customer' | 'technician' | null) => Promise<void>;
  markOnboardingDone: () => Promise<void>;
  login: (user: User) => Promise<void>;
  loginAsGuest: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  // Notifications
  notifReadIds: string[];
  markNotifRead: (id: string) => void;
  markAllNotifsRead: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const DEFAULT_USER: User = {
  id: '1',
  name: 'Mohammed Al-Rashid',
  phone: '+966 50 123 4567',
  membership: 'premium',
  points: 1240,
  vehicles: [
    { id: 'v1', make: 'Toyota', model: 'Camry', year: '2022', plate: 'ABC 1234', color: 'White' },
    { id: 'v2', make: 'GMC', model: 'Yukon', year: '2021', plate: 'XYZ 5678', color: 'Black' },
  ],
};

interface AppProviderProps {
  children: ReactNode;
  initialSession?: {
    user: User | null;
    hasSeenOnboarding: boolean;
    role: 'customer' | 'technician' | null;
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
  const [notifReadIds, setNotifReadIds] = useState<string[]>([]);

  const isGuestRef = useRef(isGuest);
  useEffect(() => { isGuestRef.current = isGuest; }, [isGuest]);

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    // Skip the AsyncStorage fetch when the layout already supplied initial state.
    if (!preloaded) loadState();
  }, []);

  // Re-hydrate session from AsyncStorage when the app returns to the foreground
  // after iOS unloads the JS bundle during a long background period.
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState !== 'active') return;
      // Only re-hydrate if in-memory user state is missing and this is not a
      // guest session (guest sessions are intentionally not persisted).
      if (userRef.current !== null || isGuestRef.current) return;
      try {
        const userData = await AsyncStorage.getItem('jai_user');
        if (userData) {
          setUser(JSON.parse(userData));
          setIsAuthenticated(true);
          setIsGuest(false);
        }
      } catch {
        // ignore errors
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  async function loadState() {
    try {
      const [onboarding, userData, storedRole] = await Promise.all([
        AsyncStorage.getItem('jai_onboarding'),
        AsyncStorage.getItem('jai_user'),
        AsyncStorage.getItem('jai_role'),
      ]);
      setHasSeenOnboarding(onboarding === 'true');
      if (storedRole === 'customer' || storedRole === 'technician') setRoleState(storedRole);
      if (userData) {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
        setIsGuest(false);
      }
    } catch {
      // ignore errors
    } finally {
      setIsLoading(false);
    }
  }

  async function setRole(r: 'customer' | 'technician' | null) {
    if (r) {
      await AsyncStorage.setItem('jai_role', r);
    } else {
      await AsyncStorage.removeItem('jai_role');
    }
    setRoleState(r);
  }

  async function markOnboardingDone() {
    await AsyncStorage.setItem('jai_onboarding', 'true');
    setHasSeenOnboarding(true);
  }

  async function login(userData: User) {
    await AsyncStorage.setItem('jai_user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
    setIsGuest(false);
  }

  async function loginAsGuest(userData: User) {
    // Guest sessions are intentionally not persisted — clear any residual stored session first
    await AsyncStorage.removeItem('jai_user');
    setUser(userData);
    setIsAuthenticated(true);
    setIsGuest(true);
  }

  async function logout() {
    await AsyncStorage.removeItem('jai_user');
    setUser(null);
    setIsAuthenticated(false);
    setIsGuest(false);
  }

  function markNotifRead(id: string) {
    setNotifReadIds(prev => prev.includes(id) ? prev : [...prev, id]);
  }

  function markAllNotifsRead() {
    setNotifReadIds(['n1', 'n2', 'n3', 'n4', 'n5', 'n6']);
  }

  async function updateUser(updates: Partial<User>) {
    if (!user) return;
    const updated = { ...user, ...updates };
    // Never persist guest sessions to storage
    if (!isGuest) {
      await AsyncStorage.setItem('jai_user', JSON.stringify(updated));
    }
    setUser(updated);
  }

  return (
    <AppContext.Provider value={{
      isLoading, hasSeenOnboarding, isAuthenticated, user, role,
      setRole, markOnboardingDone, login, loginAsGuest, logout, updateUser,
      notifReadIds, markNotifRead, markAllNotifsRead,
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

