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
}

/** userId → last known GPS position */
export const techLocations = new Map<number, TechLocation>();

/** Update (or insert) the last known position for a technician. */
export function setTechLocation(userId: number, lat: number, lng: number): void {
  techLocations.set(userId, { lat, lng, seenAt: new Date() });
}
