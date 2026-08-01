/**
 * Native version of TrackingMap — renders Leaflet + OpenStreetMap inside
 * a WebView. No Google Maps API key required.
 *
 * Metro resolves TrackingMap.web.tsx on web; this file is used on native
 * (iOS + Android).
 *
 * Tech-marker updates are pushed via injectJavaScript so the map never
 * fully re-mounts when the technician position changes.
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import WebView from 'react-native-webview';

export interface TrackingMapProps {
  customerLat: number;
  customerLng: number;
  techLat?: number;
  techLng?: number;
  height?: number;
}

// ── Inline Leaflet HTML ────────────────────────────────────────────────────────
function buildHtml(customerLat: number, customerLng: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    html,body,#map{margin:0;padding:0;width:100%;height:100%;background:#e8e4f5;}
    .leaflet-container{font-family:-apple-system,sans-serif;background:#e8e4f5;}
    .customer-pin{
      width:18px;height:18px;
      background:#C21875;border-radius:50%;
      border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
    }
    .tech-pin-wrap{position:relative;}
    .tech-pin{
      width:22px;height:22px;
      background:#2D1B69;border-radius:50%;
      border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
    }
    .tech-pulse{
      position:absolute;top:-8px;left:-8px;
      width:38px;height:38px;border-radius:50%;
      background:rgba(45,27,105,0.25);
      animation:jai-pulse 1.8s ease-out infinite;
    }
    @keyframes jai-pulse{
      0%  {transform:scale(1);  opacity:0.7;}
      100%{transform:scale(2.2);opacity:0;}
    }
  </style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var cLat = ${customerLat}, cLng = ${customerLng};
  var map = L.map('map', { zoomControl: true, attributionControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
  }).addTo(map);
  map.setView([cLat, cLng], 15);

  var customerIcon = L.divIcon({
    html: '<div class="customer-pin"></div>',
    className: '', iconSize: [18,18], iconAnchor: [9,9]
  });
  var customerMarker = L.marker([cLat, cLng], { icon: customerIcon, zIndexOffset: 10 })
    .bindTooltip('Your location', { direction: 'top' })
    .addTo(map);

  var techMarker = null;

  function updateTech(lat, lng) {
    var techIcon = L.divIcon({
      html: '<div class="tech-pin-wrap"><div class="tech-pulse"></div><div class="tech-pin"></div></div>',
      className: '', iconSize: [22,22], iconAnchor: [11,11]
    });
    if (!techMarker) {
      techMarker = L.marker([lat, lng], { icon: techIcon })
        .bindTooltip('Technician', { direction: 'top' })
        .addTo(map);
    } else {
      techMarker.setLatLng([lat, lng]);
    }
    var bounds = L.latLngBounds([[cLat, cLng], [lat, lng]]);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
  }

  function updateCustomer(lat, lng) {
    cLat = lat; cLng = lng;
    customerMarker.setLatLng([lat, lng]);
    if (!techMarker) map.setView([lat, lng], 15, { animate: true });
  }
</script>
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webViewRef = useRef<any>(null);
  const lat = customerLat ?? 24.7136;
  const lng = customerLng ?? 46.6753;

  // Push tech position into the map without remounting
  useEffect(() => {
    if (techLat == null || techLng == null) return;
    webViewRef.current?.injectJavaScript(
      `updateTech(${techLat}, ${techLng}); true;`
    );
  }, [techLat, techLng]);

  // Push customer position update (if GPS resolves after mount)
  useEffect(() => {
    if (customerLat == null || customerLng == null) return;
    webViewRef.current?.injectJavaScript(
      `updateCustomer(${customerLat}, ${customerLng}); true;`
    );
  }, [customerLat, customerLng]);

  return (
    <WebView
      ref={webViewRef}
      style={[styles.map, height != null && { height }]}
      source={{ html: buildHtml(lat, lng) }}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      geolocationEnabled={false}
      scrollEnabled={false}
      bounces={false}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      // Allow OSM tile requests (Android WebView network policy)
      mixedContentMode="always"
    />
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
