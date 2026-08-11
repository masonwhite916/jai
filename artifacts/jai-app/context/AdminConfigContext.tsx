/**
 * AdminConfigContext — app-wide theme, offers, announcement, service
 * visibility, contact info, and packages driven by the in-app admin panel.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AppTheme {
  gradientStart: string;
  gradientMid:   string;
  gradientEnd:   string;
  primary:       string;
  secondary:     string;
}

export interface AppOffer {
  id:         string;
  titleEn:    string;
  titleAr:    string;
  subtitleEn: string;
  subtitleAr: string;
  color:      string;
  color2:     string;
  active:     boolean;
}

export interface AppAnnouncement {
  titleEn:   string;
  titleAr:   string;
  color:     string;
  textColor: string;
  active:    boolean;
}

export interface AppServiceConfig {
  hidden: string[];
}

export interface AppContactConfig {
  phone:    string;
  whatsapp: string;
}

export interface AppPlan {
  id:         string;
  nameEn:     string;
  nameAr:     string;
  subtitleEn: string;
  subtitleAr: string;
  price:      string;
  color1:     string;
  color2:     string;
  popular:    boolean;
  active:     boolean;
  benefitsEn: string[];
  benefitsAr: string[];
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_THEME: AppTheme = {
  gradientStart: '#2D1B69', gradientMid: '#5B2C91', gradientEnd: '#C21875',
  primary: '#C21875', secondary: '#5B2C91',
};

const DEFAULT_ANNOUNCEMENT: AppAnnouncement = {
  titleEn: '', titleAr: '', color: '#2D1B69', textColor: '#FFFFFF', active: false,
};

const DEFAULT_CONTACT: AppContactConfig = { phone: '966555616449', whatsapp: '966555616449' };

export const DEFAULT_PLANS: AppPlan[] = [
  { id: 'basic',     nameEn: 'Basic Package',     nameAr: 'الباقة الأساسية', subtitleEn: 'Daily Use',               subtitleAr: 'للاستخدام اليومي',       price: '199', color1: '#5B2C91', color2: '#7B2A9E', popular: false, active: true, benefitsEn: ['Battery charge — 6 times','Fuel supply — 6 times','Tire change — 6 times','Light electrical & mechanical maintenance — 2 times','Emergency car towing — 2 times'], benefitsAr: ['شحن البطارية — 6 مرات','تزويد الوقود — 6 مرات','تغيير الإطارات — 6 مرات','صيانة كهربائية وميكانيكية خفيفة — مرتان','سحب السيارة في حالات الطوارئ — مرتان'] },
  { id: 'accidents', nameEn: 'Accidents Package', nameAr: 'باقة الحوادث',    subtitleEn: 'Emergency Coverage',     subtitleAr: 'لحالات الطوارئ',         price: '299', color1: '#2D1B69', color2: '#5B2C91', popular: true,  active: true, benefitsEn: ['Battery charge — 6 times','Fuel supply — 6 times','Tire change — 6 times','Light electrical & mechanical maintenance — 2 times','Car towing in breakdowns — 2 times','Transfer to accident assessment center',"Workshop of client's choice"], benefitsAr: ['شحن البطارية — 6 مرات','تزويد الوقود — 6 مرات','تغيير الإطارات — 6 مرات','صيانة كهربائية وميكانيكية خفيفة','سحب السيارة في حالة العطل — مرتان','نقل سيارة الحادث إلى مركز تقدير الحوادث','ورشة من اختيار العميل'] },
  { id: 'rental',    nameEn: 'Rental Package',    nameAr: 'باقة الإجرة',     subtitleEn: 'Full Coverage & Comfort', subtitleAr: 'تغطية شاملة وراحة تامة', price: '600', color1: '#8B35BB', color2: '#C21875', popular: false, active: true, benefitsEn: ['Battery charge — 6 times','Fuel supply — 6 times','Tire change — 6 times','Light electrical & mechanical maintenance — 2 times','Car towing in breakdowns — 2 times','Computer fault diagnostics — 3 times'], benefitsAr: ['شحن البطارية — 6 مرات','تزويد الوقود — 6 مرات','تغيير الإطارات — 6 مرات','صيانة كهربائية وميكانيكية خفيفة — مرتان','سحب السيارة في حالة العطل — مرتان','كشف الأعطال بالكمبيوتر — 3 مرات'] },
];

const CACHE_KEY     = '@jai_app_config_v3';
const TOKEN_KEY     = '@jai_admin_token_v1';
const CACHE_MAX_AGE = 5 * 60 * 1000;

// ── Context shape ─────────────────────────────────────────────────────────────

interface AdminConfigContextType {
  theme:               AppTheme;
  offers:              AppOffer[];
  announcement:        AppAnnouncement;
  hiddenServices:      string[];
  contact:             AppContactConfig;
  plans:               AppPlan[];
  isAdmin:             boolean;
  isLoading:           boolean;
  login:               (password: string) => Promise<void>;
  logout:              () => Promise<void>;
  updateTheme:         (overrides: Partial<AppTheme>) => Promise<void>;
  updateOffers:        (offers: AppOffer[]) => Promise<void>;
  updateAnnouncement:  (a: AppAnnouncement) => Promise<void>;
  updateServiceConfig: (cfg: AppServiceConfig) => Promise<void>;
  updateContact:       (c: AppContactConfig) => Promise<void>;
  updatePlans:         (plans: AppPlan[]) => Promise<void>;
  refresh:             () => Promise<void>;
}

const AdminConfigContext = createContext<AdminConfigContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AdminConfigProvider({ children }: { children: React.ReactNode }) {
  const [theme,          setTheme]          = useState<AppTheme>(DEFAULT_THEME);
  const [offers,         setOffers]         = useState<AppOffer[]>([]);
  const [announcement,   setAnnouncement]   = useState<AppAnnouncement>(DEFAULT_ANNOUNCEMENT);
  const [hiddenServices, setHiddenServices] = useState<string[]>([]);
  const [contact,        setContact]        = useState<AppContactConfig>(DEFAULT_CONTACT);
  const [plans,          setPlans]          = useState<AppPlan[]>(DEFAULT_PLANS);
  const [adminToken,     setAdminToken]     = useState<string | null>(null);
  const [isLoading,      setIsLoading]      = useState(true);

  const isAdmin = !!adminToken;

  const applyConfig = useCallback((data: Partial<{
    theme: Partial<AppTheme>; offers: AppOffer[]; announcement: AppAnnouncement;
    services: AppServiceConfig; contact: AppContactConfig; plans: AppPlan[];
  }>) => {
    if (data.theme)        setTheme({ ...DEFAULT_THEME, ...data.theme });
    if (data.offers)       setOffers(data.offers);
    if (data.announcement) setAnnouncement(data.announcement);
    if (data.services)     setHiddenServices(data.services.hidden ?? []);
    if (data.contact)      setContact(data.contact);
    if (data.plans)        setPlans(data.plans);
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const data = await apiFetch<any>('/api/app-config', { skipAuth: true });
      applyConfig(data);
      const newTheme = { ...DEFAULT_THEME, ...(data.theme ?? {}) };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        theme: newTheme, offers: data.offers ?? [], announcement: data.announcement ?? DEFAULT_ANNOUNCEMENT,
        services: data.services ?? { hidden: [] }, contact: data.contact ?? DEFAULT_CONTACT,
        plans: data.plans ?? DEFAULT_PLANS, ts: Date.now(),
      }));
    } catch { /* use cached / defaults */ }
  }, [applyConfig]);

  useEffect(() => {
    async function init() {
      try {
        const [cached, token] = await Promise.all([
          AsyncStorage.getItem(CACHE_KEY),
          AsyncStorage.getItem(TOKEN_KEY),
        ]);
        if (cached) {
          const parsed = JSON.parse(cached);
          applyConfig(parsed);
          if (parsed.ts && Date.now() - parsed.ts < CACHE_MAX_AGE) {
            if (token) setAdminToken(token);
            setIsLoading(false);
            return;
          }
        }
        if (token) setAdminToken(token);
      } catch { /* ignore */ }
      await fetchConfig();
      setIsLoading(false);
    }
    init();
  }, [fetchConfig, applyConfig]);

  function authHeaders(token: string) {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }

  async function saveCache(overrides: object) {
    try {
      const prev = await AsyncStorage.getItem(CACHE_KEY);
      const base = prev ? JSON.parse(prev) : {};
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ...base, ...overrides, ts: Date.now() }));
    } catch { /* non-fatal */ }
  }

  async function login(password: string) {
    let data: { token?: string } = {};
    try {
      data = await apiFetch<{ token: string }>('/api/admin/login', {
        method: 'POST', skipAuth: true, body: JSON.stringify({ password }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      throw new Error(msg.includes('401') || msg.includes('Incorrect') ? 'Incorrect password' : 'Login failed. Please try again.');
    }
    if (!data?.token) throw new Error('Login failed. Please try again.');
    setAdminToken(data.token);
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
  }

  async function logout() {
    setAdminToken(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
  }

  async function updateTheme(overrides: Partial<AppTheme>) {
    if (!adminToken) throw new Error('Not authenticated');
    const merged = { ...theme, ...overrides };
    await apiFetch('/api/admin/app-config/theme', { method: 'PUT', skipAuth: true, headers: authHeaders(adminToken), body: JSON.stringify(merged) });
    setTheme({ ...DEFAULT_THEME, ...merged });
    await saveCache({ theme: merged });
  }

  async function updateOffers(newOffers: AppOffer[]) {
    if (!adminToken) throw new Error('Not authenticated');
    await apiFetch('/api/admin/app-config/offers', { method: 'PUT', skipAuth: true, headers: authHeaders(adminToken), body: JSON.stringify(newOffers) });
    setOffers(newOffers);
    await saveCache({ offers: newOffers });
  }

  async function updateAnnouncement(a: AppAnnouncement) {
    if (!adminToken) throw new Error('Not authenticated');
    await apiFetch('/api/admin/app-config/announcement', { method: 'PUT', skipAuth: true, headers: authHeaders(adminToken), body: JSON.stringify(a) });
    setAnnouncement(a);
    await saveCache({ announcement: a });
  }

  async function updateServiceConfig(cfg: AppServiceConfig) {
    if (!adminToken) throw new Error('Not authenticated');
    await apiFetch('/api/admin/app-config/services', { method: 'PUT', skipAuth: true, headers: authHeaders(adminToken), body: JSON.stringify(cfg) });
    setHiddenServices(cfg.hidden);
    await saveCache({ services: cfg });
  }

  async function updateContact(c: AppContactConfig) {
    if (!adminToken) throw new Error('Not authenticated');
    await apiFetch('/api/admin/app-config/contact', { method: 'PUT', skipAuth: true, headers: authHeaders(adminToken), body: JSON.stringify(c) });
    setContact(c);
    await saveCache({ contact: c });
  }

  async function updatePlans(newPlans: AppPlan[]) {
    if (!adminToken) throw new Error('Not authenticated');
    await apiFetch('/api/admin/app-config/plans', { method: 'PUT', skipAuth: true, headers: authHeaders(adminToken), body: JSON.stringify(newPlans) });
    setPlans(newPlans);
    await saveCache({ plans: newPlans });
  }

  return (
    <AdminConfigContext.Provider value={{
      theme, offers, announcement, hiddenServices, contact, plans,
      isAdmin, isLoading, login, logout,
      updateTheme, updateOffers, updateAnnouncement, updateServiceConfig, updateContact, updatePlans,
      refresh: fetchConfig,
    }}>
      {children}
    </AdminConfigContext.Provider>
  );
}

export function useAdminConfig(): AdminConfigContextType {
  const ctx = useContext(AdminConfigContext);
  if (!ctx) throw new Error('useAdminConfig must be used within AdminConfigProvider');
  return ctx;
}
