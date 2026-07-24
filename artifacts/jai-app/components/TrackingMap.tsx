/**
 * Native version of TrackingMap — uses react-native-maps MapView.
 * Metro resolves TrackingMap.web.tsx on web instead of this file.
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, type MapViewProps, type Camera } from 'react-native-maps';

export interface TrackingMapProps {
  customerLat: number;
  customerLng: number;
  techLat?: number;
  techLng?: number;
  height?: number;
}

const DELTA = 0.02; // ~2 km visible radius when only one pin is shown

export default function TrackingMap({
  customerLat,
  customerLng,
  techLat,
  techLng,
  height,
}: TrackingMapProps) {
  const mapRef = useRef<MapView>(null);

  // Fit camera to show both markers whenever tech position changes
  useEffect(() => {
    if (!mapRef.current) return;

    if (techLat != null && techLng != null) {
      mapRef.current.fitToCoordinates(
        [
          { latitude: customerLat, longitude: customerLng },
          { latitude: techLat,     longitude: techLng     },
        ],
        {
          edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
          animated: true,
        },
      );
    } else {
      const camera: Partial<Camera> = {
        center: { latitude: customerLat, longitude: customerLng },
        zoom: 15,
      };
      mapRef.current.animateCamera(camera, { duration: 600 });
    }
  }, [techLat, techLng, customerLat, customerLng]);

  return (
    <MapView
      ref={mapRef}
      style={[styles.map, height != null && { height }]}
      initialRegion={{
        latitude:      customerLat,
        longitude:     customerLng,
        latitudeDelta:  DELTA,
        longitudeDelta: DELTA,
      }}
      showsUserLocation={false}
      showsMyLocationButton={false}
      toolbarEnabled={false}
    >
      {/* Customer pin — pink/magenta */}
      <Marker
        coordinate={{ latitude: customerLat, longitude: customerLng }}
        title="Your location"
        pinColor="#C21875"
      />

      {/* Tech pin — deep purple, only shown once we have a real position */}
      {techLat != null && techLng != null && (
        <Marker
          coordinate={{ latitude: techLat, longitude: techLng }}
          title="Technician"
          pinColor="#2D1B69"
        />
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
