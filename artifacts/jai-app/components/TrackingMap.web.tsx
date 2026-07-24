/**
 * Web version of TrackingMap — uses the leaflet npm package directly on a
 * plain <div>. No iframe, no CDN fetch, no sandbox restrictions.
 *
 * Metro resolves this file on web; TrackingMap.tsx is used on native.
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type { TrackingMapProps } from './TrackingMap';

// ── Leaflet CSS injection (done once) ──────────────────────────────────────────
function ensureLeafletCss() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('leaflet-css')) return;
  const link = document.createElement('link');
  link.id   = 'leaflet-css';
  link.rel  = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);

  // Fix Leaflet default icon paths broken by bundlers
  const style = document.createElement('style');
  style.textContent = `
    .leaflet-container { font-family: inherit; background: #e8e4f5; }
    .customer-pin {
      width: 18px; height: 18px;
      background: #C21875; border-radius: 50%;
      border: 3px solid #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }
    .tech-pin-wrap { position: relative; }
    .tech-pin {
      width: 22px; height: 22px;
      background: #2D1B69; border-radius: 50%;
      border: 3px solid #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }
    .tech-pulse {
      position: absolute; top: -8px; left: -8px;
      width: 38px; height: 38px; border-radius: 50%;
      background: rgba(45,27,105,0.25);
      animation: jai-pulse 1.8s ease-out infinite;
    }
    @keyframes jai-pulse {
      0%   { transform: scale(1);   opacity: 0.7; }
      100% { transform: scale(2.2); opacity: 0;   }
    }
  `;
  document.head.appendChild(style);
}

export default function TrackingMap({
  customerLat,
  customerLng,
  techLat,
  techLng,
}: TrackingMapProps) {
  // Fallback to Riyadh centre if GPS hasn't resolved yet
  const lat = customerLat ?? 24.7136;
  const lng = customerLng ?? 46.6753;

  const divRef       = useRef<HTMLDivElement | null>(null);
  const mapRef       = useRef<any>(null);
  const techRef      = useRef<any>(null);
  const customerRef  = useRef<any>(null);
  const lRef         = useRef<any>(null); // cached Leaflet module

  // ── Initialise map once on mount ────────────────────────────────────────────
  useEffect(() => {
    ensureLeafletCss();

    let cancelled = false;
    (async () => {
      const L = await import('leaflet');
      if (cancelled || !divRef.current || mapRef.current) return;
      lRef.current = L;

      // Leaflet default icon fix for bundlers
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(divRef.current, { zoomControl: true, attributionControl: true });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="https://openstreetmap.org">OSM</a>',
      }).addTo(map);

      // Customer pin
      const customerIcon = L.divIcon({
        html: '<div class="customer-pin"></div>',
        className: '', iconSize: [18, 18], iconAnchor: [9, 9],
      });
      customerRef.current = L.marker([lat, lng], { icon: customerIcon, zIndexOffset: 10 })
        .bindTooltip('Your location', { direction: 'top' })
        .addTo(map);

      // Tech pin (only if we already have a position)
      if (techLat != null && techLng != null) {
        techRef.current = placeTech(L, map, techLat, techLng);
        fitBoth(L, map, lat, lng, techLat, techLng);
      } else {
        map.setView([lat, lng], 15);
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current   = null;
        techRef.current  = null;
        customerRef.current = null;
      }
    };
    // Run once — lat/lng updates are handled by the effects below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update customer marker if GPS arrives after mount ───────────────────────
  useEffect(() => {
    if (!mapRef.current || !lRef.current || customerLat == null || customerLng == null) return;
    customerRef.current?.setLatLng([customerLat, customerLng]);
    if (!techRef.current) {
      mapRef.current.setView([customerLat, customerLng], 15, { animate: true });
    }
  }, [customerLat, customerLng]);

  // ── Update tech marker when a GPS update arrives ────────────────────────────
  useEffect(() => {
    const L   = lRef.current;
    const map = mapRef.current;
    if (!L || !map || techLat == null || techLng == null) return;

    if (!techRef.current) {
      techRef.current = placeTech(L, map, techLat, techLng);
    } else {
      techRef.current.setLatLng([techLat, techLng]);
    }
    fitBoth(L, map, lat, lng, techLat, techLng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [techLat, techLng]);

  return (
    <View style={styles.container}>
      {/* @ts-ignore — plain div is fine in RN-web */}
      <div ref={divRef} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function placeTech(L: any, map: any, techLat: number, techLng: number) {
  const techIcon = L.divIcon({
    html: '<div class="tech-pin-wrap"><div class="tech-pulse"></div><div class="tech-pin"></div></div>',
    className: '', iconSize: [22, 22], iconAnchor: [11, 11],
  });
  const marker = L.marker([techLat, techLng], { icon: techIcon })
    .bindTooltip('Technician', { direction: 'top' })
    .addTo(map);
  return marker;
}

function fitBoth(L: any, map: any, cLat: number, cLng: number, tLat: number, tLng: number) {
  const bounds = L.latLngBounds([[cLat, cLng], [tLat, tLng]]);
  map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' as any },
});
