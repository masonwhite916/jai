/**
 * Fetches banner + theme overrides from the API and applies them at runtime.
 * - Banner overrides are exposed via context and consumed by LanguageContext.
 * - Theme overrides are written directly into CSS custom properties on :root.
 */
'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface BannerLang {
  hero_badge?: string;
  hero_h1a?: string;
  hero_h1b?: string;
  hero_sub?: string;
  hero_cta1?: string;
  hero_cta2?: string;
}

export interface SiteSettings {
  banners: { en?: BannerLang; ar?: BannerLang };
  theme:   { primary?: string; secondary?: string; accent?: string };
  heroImageUpdatedAt?: string;
}

interface SiteSettingsCtx {
  settings: SiteSettings | null;
}

const SiteSettingsContext = createContext<SiteSettingsCtx>({ settings: null });

// Convert a hex colour (#rrggbb) to an HSL string ("H S% L%") for CSS vars
function hexToHsl(hex: string): string | null {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyTheme(theme: SiteSettings['theme']) {
  const root = document.documentElement;
  const pairs: [string, string | undefined][] = [
    ['--primary',   theme.primary],
    ['--secondary', theme.secondary],
    ['--accent',    theme.accent],
  ];
  for (const [prop, hex] of pairs) {
    if (hex) {
      const hsl = hexToHsl(hex);
      if (hsl) root.style.setProperty(prop, hsl);
    } else {
      root.style.removeProperty(prop);
    }
  }
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const url = '/api/site-settings';

  const { data } = useQuery<SiteSettings>({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch site settings');
      return res.json() as Promise<SiteSettings>;
    },
    staleTime: 30_000,     // re-fetch at most every 30 s
    refetchInterval: 60_000,
    retry: false,
  });

  // Apply theme CSS vars whenever data arrives or changes
  useEffect(() => {
    if (data?.theme) applyTheme(data.theme);
  }, [data?.theme]);

  return (
    <SiteSettingsContext.Provider value={{ settings: data ?? null }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
