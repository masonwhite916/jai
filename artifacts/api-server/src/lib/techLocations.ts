/**
 * Technician GPS location store.
 *
 * In-memory Map is the fast read path (admin live map, WS relay).
 * Every update is also written to the `technician_locations` DB table so
 * the last known position survives server restarts.
 */

import { db, technicianLocations } from "@workspace/db";

export interface TechLocation {
  lat:         number;
  lng:         number;
  seenAt:      Date;
  /** Timestamp of the last significant position change (>MOVE_THRESHOLD_M metres). */
  lastMovedAt: Date;
}

/** userId → last known GPS position (fast in-memory read path) */
export const techLocations = new Map<number, TechLocation>();

/**
 * Minimum distance (metres) a technician must travel between updates before
 * lastMovedAt is refreshed. ~50 m filters GPS jitter without masking real movement.
 */
const MOVE_THRESHOLD_M = 50;

/** Approximate distance in metres between two WGS-84 coordinates (Haversine). */
function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R    = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function safeNow(): Date {
  const d = new Date();
  return isNaN(d.getTime()) ? new Date(0) : d;
}

/**
 * Update the last known position for a technician.
 * Writes to in-memory Map immediately, then persists to DB asynchronously.
 */
export function setTechLocation(userId: number, lat: number, lng: number): void {
  const prev = techLocations.get(userId);
  const now  = safeNow();

  let lastMovedAt: Date;
  if (!prev) {
    lastMovedAt = now;
  } else {
    const dist = haversineMeters(prev.lat, prev.lng, lat, lng);
    lastMovedAt = dist >= MOVE_THRESHOLD_M ? now : prev.lastMovedAt;
  }

  techLocations.set(userId, { lat, lng, seenAt: now, lastMovedAt });

  // Persist to DB (fire-and-forget — never block the WS handler)
  db.insert(technicianLocations)
    .values({ user_id: userId, lat, lng, seen_at: now, last_moved_at: lastMovedAt })
    .onConflictDoUpdate({
      target: technicianLocations.user_id,
      set:    { lat, lng, seen_at: now, last_moved_at: lastMovedAt },
    })
    .catch(() => { /* ignore — in-memory value is already updated */ });
}

/**
 * Warm the in-memory cache from the DB on server startup.
 * Call once before the WS server starts accepting connections.
 */
export async function warmTechLocationsFromDb(): Promise<void> {
  try {
    const rows = await db.select().from(technicianLocations);
    for (const row of rows) {
      techLocations.set(row.user_id, {
        lat:         row.lat,
        lng:         row.lng,
        seenAt:      row.seen_at,
        lastMovedAt: row.last_moved_at,
      });
    }
  } catch { /* non-fatal — cache simply starts empty */ }
}

/**
 * Safely serialise a Date to an ISO string.
 * Falls back to the current time if the Date is missing or invalid.
 */
export function safeIsoString(d: Date | null | undefined): string {
  if (d && !isNaN(d.getTime())) return d.toISOString();
  return new Date().toISOString();
}
