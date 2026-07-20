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

/** Returns true when d is a real, non-NaN Date. */
function isValidDate(d: Date): boolean {
  return !isNaN(d.getTime());
}

/**
 * Return a guaranteed-valid Date.  In practice `new Date()` is always valid,
 * but this guard makes the property explicit so callers can rely on it even
 * after future refactors that accept external timestamps.
 */
function safeNow(): Date {
  const d = new Date();
  return isValidDate(d) ? d : new Date(0);
}

/** Update (or insert) the last known position for a technician. */
export function setTechLocation(userId: number, lat: number, lng: number): void {
  const prev = techLocations.get(userId);
  const now = safeNow();

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

/**
 * Safely serialise a Date to an ISO string.
 * Falls back to the current time if the Date is missing or invalid, so the
 * WebSocket broadcast never forwards a null or "Invalid Date" string.
 */
export function safeIsoString(d: Date | null | undefined): string {
  if (d && isValidDate(d)) return d.toISOString();
  return new Date().toISOString();
}
