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
  // Nominatim (OpenStreetMap) — free, returns neighbourhood/suburb detail
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&accept-language=${lang}`,
      { headers: { 'Accept-Language': lang } },
    );
    if (resp.ok) {
      const d = await resp.json();
      const a = d.address ?? {};
      // neighbourhood → suburb → quarter → road as the "district" detail
      const district = a.neighbourhood || a.suburb || a.quarter || a.county || null;
      const street   = a.road || a.pedestrian || a.footway || null;
      const city     = a.city || a.town || a.village || a.county || null;
      const country  = a.country || null;
      return {
        short: district || street || city || null,
        fullParts: [street, district, city],
        cityParts: [city, country],
      };
    }
  } catch {
    // offline / blocked — fall through
  }

  // BigDataCloud — last resort
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
  const geoLang = useRef(lang);
  useEffect(() => { geoLang.current = lang; }, [lang]);

  /** Update address labels for a given coordinate pair. */
  const updateAddress = useCallback(async (c: Coords) => {
    const sep = geoLang.current === 'ar' ? '، ' : ', ';
    const geo = await reverseGeocode(c, geoLang.current);
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
  }, []);

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
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          mayShowUserSettingsDialog: true,
        }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('gps-timeout')), 20000)),
      ]);
      const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setCoords(c);
      await updateAddress(c);
      setStatus('ready');
    } catch {
      setStatus('error');
    } finally {
      busy.current = false;
    }
  }, [updateAddress]);

  // Start a high-accuracy position watcher on mount.
  // It keeps coords fresh as the user moves without draining battery fast
  // (distanceInterval means updates only fire when position shifts ≥ 10 m).
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted || cancelled) return;

        // Kick off an immediate high-accuracy fix first
        void refresh();

        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,      // at most every 5 s
            distanceInterval: 10,    // only when moved ≥ 10 m
          },
          (loc) => {
            if (cancelled) return;
            const c = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };
            setCoords(c);
            setStatus('ready');
            // Re-geocode only when accuracy is reasonable (≤ 50 m)
            if ((loc.coords.accuracy ?? 999) <= 50) {
              void updateAddress(c);
            }
          },
        );
      } catch {
        // Watcher unavailable (e.g. on web in some browsers) —
        // the one-shot refresh() above is still the fallback.
      }
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
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
