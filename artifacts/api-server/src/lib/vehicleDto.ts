import type { vehicles } from "@workspace/db";

type VehicleRow = typeof vehicles.$inferSelect;

/** Vehicle shape consumed by the mobile/web clients (string id, no internal columns). */
export interface VehicleDto {
  id:    string;
  make:  string;
  model: string;
  year:  string;
  plate: string;
  color: string;
}

export function toVehicleDto(v: VehicleRow): VehicleDto {
  return {
    id:    String(v.id),
    make:  v.make,
    model: v.model,
    year:  v.year,
    plate: v.plate,
    color: v.color,
  };
}
