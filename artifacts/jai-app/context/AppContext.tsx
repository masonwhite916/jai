import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  membership: 'none' | 'basic' | 'accidents' | 'rental';
  vehicles: Vehicle[];
  points: number;
}

interface AppContextType {
  isLoading: boolean;
  hasSeenOnboarding: boolean;
  isAuthenticated: boolean;
  user: User | null;
  markOnboardingDone: () => Promise<void>;
  login: (user: User) => Promise<void>;
  loginAsGuest: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

const DEFAULT_USER: User = {
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadState();
  }, []);

  async function loadState() {
    try {
      const [onboarding, userData] = await Promise.all([
        AsyncStorage.getItem('jai_onboarding'),
        AsyncStorage.getItem('jai_user'),
      ]);
      setHasSeenOnboarding(onboarding === 'true');
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
      isLoading, hasSeenOnboarding, isAuthenticated, user,
      markOnboardingDone, login, loginAsGuest, logout, updateUser,
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

export { DEFAULT_USER };
