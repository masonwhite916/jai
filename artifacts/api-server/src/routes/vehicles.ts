import { Router, type IRouter } from "express";
import { db, vehicles } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { toVehicleDto } from "../lib/vehicleDto";

const router: IRouter = Router();

// All vehicle routes require authentication.
// Any signed-in user may manage their OWN vehicles — customers register the
// cars they need roadside help with, technicians their service vehicles.
// Ownership is always enforced through user_id.

const MAX_VEHICLES_PER_USER = 20;

function cleanField(value: unknown, max = 50): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// ── GET /api/vehicles ─────────────────────────────────────────────────────────
// Returns the caller's vehicles.
router.get("/vehicles", requireAuth, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.user_id, req.userId!));
    res.json({ vehicles: rows.map(toVehicleDto) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// ── POST /api/vehicles ────────────────────────────────────────────────────────
// Add a vehicle for the caller.
router.post("/vehicles", requireAuth, async (req, res) => {
  try {
    const body  = req.body as Record<string, unknown>;
    const make  = cleanField(body.make);
    const model = cleanField(body.model);
    const year  = cleanField(body.year, 4);
    const plate = cleanField(body.plate, 20).toUpperCase();
    const color = cleanField(body.color, 30);

    if (!make || !model || !year || !plate || !color) {
      res.status(400).json({ error: "make, model, year, plate, and color are required" });
      return;
    }

    const existing = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(eq(vehicles.user_id, req.userId!));
    if (existing.length >= MAX_VEHICLES_PER_USER) {
      res.status(400).json({ error: "Vehicle limit reached" });
      return;
    }

    const [vehicle] = await db
      .insert(vehicles)
      .values({ user_id: req.userId!, make, model, year, plate, color })
      .returning();
    res.status(201).json({ vehicle: toVehicleDto(vehicle) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// ── PUT /api/vehicles/:id ─────────────────────────────────────────────────────
// Update a vehicle. Caller must own it.
router.put("/vehicles/:id", requireAuth, async (req, res) => {
  const vehicleId = Number(req.params.id);
  if (isNaN(vehicleId)) {
    res.status(400).json({ error: "Invalid vehicle id" });
    return;
  }
  try {
    const body = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (body.make  !== undefined) updates.make  = cleanField(body.make);
    if (body.model !== undefined) updates.model = cleanField(body.model);
    if (body.year  !== undefined) updates.year  = cleanField(body.year, 4);
    if (body.plate !== undefined) updates.plate = cleanField(body.plate, 20).toUpperCase();
    if (body.color !== undefined) updates.color = cleanField(body.color, 30);

    const result = await db
      .update(vehicles)
      .set(updates)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.user_id, req.userId!)))
      .returning();

    if (!result.length) {
      res.status(404).json({ error: "Vehicle not found" });
      return;
    }
    res.json({ vehicle: toVehicleDto(result[0]) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// ── DELETE /api/vehicles/:id ──────────────────────────────────────────────────
// Remove a vehicle. Caller must own it.
router.delete("/vehicles/:id", requireAuth, async (req, res) => {
  const vehicleId = Number(req.params.id);
  if (isNaN(vehicleId)) {
    res.status(400).json({ error: "Invalid vehicle id" });
    return;
  }
  try {
    const result = await db
      .delete(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.user_id, req.userId!)))
      .returning({ id: vehicles.id });

    if (!result.length) {
      res.status(404).json({ error: "Vehicle not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
