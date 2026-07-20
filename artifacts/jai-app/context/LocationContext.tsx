import React, {
  createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode,
} from 'react';
import * as Location from 'expo-location';
import { useLanguage } from './LanguageContext';

export type GpsStatus = 'idle' | 'loading' | 'ready' | 'denied' | 'error';

export interface Coords { latitude: number; longitude: number }

interface LocationContextType {
  status: GpsStatus;
  coords: Coords | null;
  /** Street / district level, e.g. "King Fahd Rd" */
  shortAddress: string | null;
  /** Full single-line address, e.g. "King Fahd Rd, Al Olaya, Riyadh" */
  fullAddress: string | null;
  /** City + country, e.g. "Riyadh, Saudi Arabia" */
  city: string | null;
  refresh: () => Promise<void>;
}

const LocationCtx = createContext<LocationContextType | null>(null);

function dedupe(parts: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const v = (p ?? '').trim();
    if (!v || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    out.push(v);
  }
  return out;
}

interface GeoResult {
  short: string | null;
  fullParts: (string | null | undefined)[];
  cityParts: (string | null | undefined)[];
}

async function reverseGeocode(coords: Coords, lang: string): Promise<GeoResult | null> {
  // Native geocoder (iOS / Android)
  try {
    const results = await Location.reverseGeocodeAsync(coords);
    const r = results[0];
    if (r) {
      return {
        short: r.street || r.name || r.district || r.city || null,
        fullParts: [r.street || r.name, r.district, r.city],
        cityParts: [r.city || r.subregion || r.region, r.country],
      };
    }
  } catch {
    // reverseGeocodeAsync is unavailable on web — fall through to HTTP geocoder
  }
  // Keyless client-side geocoder (works on web)
  try {
    const resp = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=${lang}`,
    );
    if (resp.ok) {
      const d = await resp.json();
      return {
        short: d.locality || d.city || null,
        fullParts: [d.locality, d.city, d.principalSubdivision],
        cityParts: [d.city || d.locality || d.principalSubdivision, d.countryName],
      };
    }
  } catch {
    // offline / blocked — caller falls back to raw coordinates
  }
  return null;
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const { lang } = useLanguage();
  const [status, setStatus] = useState<GpsStatus>('idle');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [shortAddress, setShortAddress] = useState<string | null>(null);
  const [fullAddress, setFullAddress] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setStatus('loading');
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setStatus('denied');
        return;
      }
      const pos = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('gps-timeout')), 15000)),
      ]);
      const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setCoords(c);
      const sep = lang === 'ar' ? '، ' : ', ';
      const geo = await reverseGeocode(c, lang);
      if (geo) {
        const full = dedupe(geo.fullParts).join(sep);
        const cityLine = dedupe(geo.cityParts).join(sep);
        setShortAddress(geo.short ?? (full || null));
        setFullAddress(full || geo.short || null);
        setCity(cityLine || null);
      } else {
        const raw = `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`;
        setShortAddress(raw);
        setFullAddress(raw);
        setCity(null);
      }
      setStatus('ready');
    } catch {
      setStatus('error');
    } finally {
      busy.current = false;
    }
  }, [lang]);

  // Detect location once on launch — GPS is core to roadside assistance
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LocationCtx.Provider value={{ status, coords, shortAddress, fullAddress, city, refresh }}>
      {children}
    </LocationCtx.Provider>
  );
}

export function useJaiLocation() {
  const ctx = useContext(LocationCtx);
  if (!ctx) throw new Error('useJaiLocation must be used within LocationProvider');
  return ctx;
}
