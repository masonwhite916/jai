/**
 * In-memory store for last known technician GPS locations.
 *
 * Written by the WebSocket dispatch server each time a location_update
 * arrives; read by the admin API routes to populate the live map.
 */

export interface TechLocation {
  lat: number;
  lng: number;
  seenAt: Date;
  /** Timestamp of the last significant position change (>MOVE_THRESHOLD_M metres). */
  lastMovedAt: Date;
}

/** userId → last known GPS position */
export const techLocations = new Map<number, TechLocation>();

/**
 * Minimum distance (metres) a technician must travel between updates before
 * lastMovedAt is refreshed.  ~50 m filters out GPS jitter without masking
 * real movement.
 */
const MOVE_THRESHOLD_M = 50;

/** Approximate distance in metres between two WGS-84 coordinates (Haversine). */
function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Update (or insert) the last known position for a technician. */
export function setTechLocation(userId: number, lat: number, lng: number): void {
  const prev = techLocations.get(userId);
  const now = new Date();

  let lastMovedAt: Date;
  if (!prev) {
    // First update — treat as a fresh start
    lastMovedAt = now;
  } else {
    const dist = haversineMeters(prev.lat, prev.lng, lat, lng);
    lastMovedAt = dist >= MOVE_THRESHOLD_M ? now : prev.lastMovedAt;
  }

  techLocations.set(userId, { lat, lng, seenAt: now, lastMovedAt });
}
