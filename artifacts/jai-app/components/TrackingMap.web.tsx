/**
 * Web version of TrackingMap — renders an interactive Leaflet map
 * inside a sandboxed iframe (srcDoc). Tech position is updated via
 * postMessage so the map doesn't re-mount on every GPS update.
 *
 * Metro resolves this file on web; TrackingMap.tsx is used on native.
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';

export interface TrackingMapProps {
  customerLat: number;
  customerLng: number;
  techLat?: number;
  techLng?: number;
  /** Height in pixels (default: fills parent) */
  height?: number;
}

function buildLeafletHtml(
  customerLat: number,
  customerLng: number,
  techLat?: number,
  techLng?: number,
): string {
  const hasTech = techLat != null && techLng != null;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html,body,#map { width:100%; height:100%; }
    .customer-dot {
      width:18px; height:18px;
      background:#C21875; border-radius:50%;
      border:3px solid #fff;
      box-shadow:0 2px 10px rgba(0,0,0,0.35);
    }
    .tech-dot {
      width:22px; height:22px;
      background:#2D1B69; border-radius:50%;
      border:3px solid #fff;
      box-shadow:0 2px 10px rgba(0,0,0,0.35);
      transition: top 0.4s ease, left 0.4s ease;
    }
    .pulse-ring {
      position:absolute; top:-7px; left:-7px;
      width:36px; height:36px; border-radius:50%;
      background:rgba(45,27,105,0.25);
      animation: pulse 1.8s ease-out infinite;
    }
    @keyframes pulse {
      0%   { transform:scale(1);   opacity:0.7; }
      100% { transform:scale(2.2); opacity:0;   }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var cLat = ${customerLat}, cLng = ${customerLng};
    var tLat = ${hasTech ? techLat : 'null'}, tLng = ${hasTech ? techLng : 'null'};

    var map = L.map('map', { zoomControl:true, attributionControl:false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom:19, attribution:'© OpenStreetMap'
    }).addTo(map);

    // ── Custom icons ────────────────────────────────────────────────
    var customerIcon = L.divIcon({
      html: '<div class="customer-dot"></div>',
      className: '', iconSize:[18,18], iconAnchor:[9,9],
    });
    var techIcon = L.divIcon({
      html: '<div style="position:relative"><div class="pulse-ring"></div><div class="tech-dot"></div></div>',
      className: '', iconSize:[22,22], iconAnchor:[11,11],
    });

    // ── Customer marker ─────────────────────────────────────────────
    L.marker([cLat, cLng], { icon:customerIcon, zIndexOffset:10 })
      .addTo(map)
      .bindTooltip('Your location', { permanent:false, direction:'top' });

    // ── Tech marker (if already known) ──────────────────────────────
    var techMarker = null;
    function placeTech(lat, lng) {
      if (!techMarker) {
        techMarker = L.marker([lat, lng], { icon:techIcon })
          .addTo(map)
          .bindTooltip('Technician', { permanent:false, direction:'top' });
      } else {
        techMarker.setLatLng([lat, lng]);
      }
      var bounds = L.latLngBounds([[cLat,cLng],[lat,lng]]);
      map.fitBounds(bounds, { padding:[50,50], maxZoom:15, animate:true });
    }

    if (tLat !== null && tLng !== null) {
      placeTech(tLat, tLng);
    } else {
      map.setView([cLat, cLng], 15);
    }

    // ── Receive live tech-position updates from the React parent ────
    window.addEventListener('message', function(e) {
      if (!e.data || e.data.type !== 'updateTech') return;
      placeTech(e.data.lat, e.data.lng);
    });
  <\/script>
</body>
</html>`;
}

export default function TrackingMap({
  customerLat,
  customerLng,
  techLat,
  techLng,
  height,
}: TrackingMapProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Track whether the iframe has finished loading so we can send postMessage
  const readyRef = useRef(false);
  const pendingRef = useRef<{ lat: number; lng: number } | null>(null);

  // Build the HTML once on mount (customer position rarely changes)
  const html = buildLeafletHtml(customerLat, customerLng, techLat, techLng);

  const sendTechPos = (lat: number, lng: number) => {
    const iframe = iframeRef.current as HTMLIFrameElement | null;
    if (readyRef.current && iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'updateTech', lat, lng }, '*');
    } else {
      pendingRef.current = { lat, lng };
    }
  };

  // Push tech position updates without remounting the iframe
  useEffect(() => {
    if (techLat != null && techLng != null) {
      sendTechPos(techLat, techLng);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [techLat, techLng]);

  const handleLoad = () => {
    readyRef.current = true;
    // Flush any position that arrived before the iframe was ready
    if (pendingRef.current) {
      sendTechPos(pendingRef.current.lat, pendingRef.current.lng);
      pendingRef.current = null;
    }
  };

  return (
    <View style={[styles.container, height != null && { height }]}>
      {React.createElement('iframe', {
        ref: iframeRef,
        srcDoc: html,
        onLoad: handleLoad,
        style: {
          width: '100%',
          height: '100%',
          border: 'none',
        },
        // Allow geolocation inside the iframe if needed
        allow: 'geolocation',
        title: 'Live tracking map',
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
});
