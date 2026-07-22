import { Router, type IRouter } from "express";
import { db, vehicles } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// All vehicle routes require authentication.
// Only technicians may create/update/delete vehicles.
// Customers receive an empty list.

// ── GET /api/vehicles ─────────────────────────────────────────────────────────
// Returns the caller's vehicles. Customers always get [].
router.get("/vehicles", requireAuth, async (req, res) => {
  try {
    if (req.userRole !== "technician") {
      res.json({ vehicles: [] });
      return;
    }
    const rows = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.user_id, req.userId!));
    res.json({ vehicles: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// ── POST /api/vehicles ────────────────────────────────────────────────────────
// Add a vehicle. Technicians only.
router.post("/vehicles", requireAuth, async (req, res) => {
  if (req.userRole !== "technician") {
    res.status(403).json({ error: "Only technicians can register vehicles" });
    return;
  }
  try {
    const { make, model, year, plate, color } = req.body as {
      make?:  string;
      model?: string;
      year?:  string;
      plate?: string;
      color?: string;
    };
    if (!make || !model || !year || !plate || !color) {
      res.status(400).json({ error: "make, model, year, plate, and color are required" });
      return;
    }
    const [vehicle] = await db
      .insert(vehicles)
      .values({ user_id: req.userId!, make, model, year, plate, color })
      .returning();
    res.status(201).json({ vehicle });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// ── PUT /api/vehicles/:id ─────────────────────────────────────────────────────
// Update a vehicle. Technicians only; must own the vehicle.
router.put("/vehicles/:id", requireAuth, async (req, res) => {
  if (req.userRole !== "technician") {
    res.status(403).json({ error: "Only technicians can update vehicles" });
    return;
  }
  const vehicleId = Number(req.params.id);
  if (isNaN(vehicleId)) {
    res.status(400).json({ error: "Invalid vehicle id" });
    return;
  }
  try {
    const { make, model, year, plate, color } = req.body as {
      make?:  string;
      model?: string;
      year?:  string;
      plate?: string;
      color?: string;
    };
    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (make  !== undefined) updates.make  = make;
    if (model !== undefined) updates.model = model;
    if (year  !== undefined) updates.year  = year;
    if (plate !== undefined) updates.plate = plate;
    if (color !== undefined) updates.color = color;

    const result = await db
      .update(vehicles)
      .set(updates)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.user_id, req.userId!)))
      .returning();

    if (!result.length) {
      res.status(404).json({ error: "Vehicle not found" });
      return;
    }
    res.json({ vehicle: result[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// ── DELETE /api/vehicles/:id ──────────────────────────────────────────────────
// Remove a vehicle. Technicians only; must own the vehicle.
router.delete("/vehicles/:id", requireAuth, async (req, res) => {
  if (req.userRole !== "technician") {
    res.status(403).json({ error: "Only technicians can delete vehicles" });
    return;
  }
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
