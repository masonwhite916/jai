import { Router, type IRouter } from "express";
import { db, serviceRequests, jobs, users } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { dispatch } from "../lib/dispatch";
import { notifyTechniciansNewJob } from "../lib/pushNotifications";

const router: IRouter = Router();

// POST /api/requests  — create a new service request
router.post("/requests", requireAuth, async (req, res) => {
  try {
    const {
      service_type, vehicle_make, vehicle_model, vehicle_year,
      vehicle_plate, vehicle_color, location_lat, location_lng, address, notes,
    } = req.body as {
      service_type: string;
      vehicle_make?: string; vehicle_model?: string; vehicle_year?: string;
      vehicle_plate?: string; vehicle_color?: string;
      location_lat?: number; location_lng?: number;
      address?: string; notes?: string;
    };

    if (!service_type) {
      res.status(400).json({ error: "service_type is required" });
      return;
    }

    const PAYOUTS: Record<string, number> = {
      battery: 120, fuel: 80, tire: 350, tow: 500, lockout: 200,
      mechanic: 300, electric: 280,
    };

    // Create the service request
    const [req_] = await db
      .insert(serviceRequests)
      .values({
        customer_id:   req.userId!,
        service_type:  service_type as any,
        vehicle_make, vehicle_model, vehicle_year,
        vehicle_plate, vehicle_color,
        location_lat, location_lng, address, notes,
      })
      .returning();

    // Create a corresponding job (unassigned) so technicians can see it
    const [job] = await db
      .insert(jobs)
      .values({
        request_id: req_.id,
        payout:     PAYOUTS[service_type] ?? 150,
        // Distance/ETA will be filled in by dispatch or technician side
      })
      .returning();

    // Fetch the customer's name + phone for the dispatch broadcast
    const [customer] = await db
      .select({ name: users.name, phone: users.phone })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    // Broadcast to all online technicians so the job appears instantly in their queue
    dispatch.broadcastToRoom("technicians", {
      type: "new_job",
      job: {
        id:           job.id,
        request_id:   req_.id,
        payout:       job.payout,
        status:       "pending",
        service_type: service_type,
        address:      address        ?? null,
        location_lat: location_lat  ?? null,
        location_lng: location_lng  ?? null,
        vehicle_make:  vehicle_make  ?? null,
        vehicle_model: vehicle_model ?? null,
        vehicle_year:  vehicle_year  ?? null,
        vehicle_plate: vehicle_plate ?? null,
        vehicle_color: vehicle_color ?? null,
        created_at:   job.created_at,
        request:      req_,
        customer: {
          name:  customer?.name  ?? "Customer",
          phone: customer?.phone ?? "",
        },
      },
    });

    // Push notification to technicians who aren't connected via WebSocket
    void notifyTechniciansNewJob({
      serviceType: service_type,
      address:     address ?? null,
      payout:      job.payout,
      jobId:       job.id,
    });

    res.status(201).json({ request: req_, job });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// GET /api/requests  — list requests for the current customer
router.get("/requests", requireAuth, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.customer_id, req.userId!))
      .orderBy(desc(serviceRequests.created_at));

    // Attach job/technician info for each request
    const enriched = await Promise.all(
      rows.map(async (r) => {
        const jobRows = await db
          .select({
            id: jobs.id, status: jobs.status, payout: jobs.payout,
            distance_km: jobs.distance_km, eta_min: jobs.eta_min,
            technician_id: jobs.technician_id,
            accepted_at: jobs.accepted_at, completed_at: jobs.completed_at,
          })
          .from(jobs)
          .where(eq(jobs.request_id, r.id))
          .orderBy(desc(jobs.created_at))
          .limit(1);

        let techName: string | null = null;
        if (jobRows[0]?.technician_id) {
          const techRows = await db
            .select({ name: users.name })
            .from(users)
            .where(eq(users.id, jobRows[0].technician_id))
            .limit(1);
          techName = techRows[0]?.name ?? null;
        }

        return { ...r, job: jobRows[0] ?? null, techName };
      }),
    );

    res.json({ requests: enriched });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// GET /api/requests/:id
router.get("/requests/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const rows = await db
      .select()
      .from(serviceRequests)
      .where(and(eq(serviceRequests.id, id), eq(serviceRequests.customer_id, req.userId!)))
      .limit(1);

    if (!rows.length) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rows[0]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// PATCH /api/requests/:id  — update status (e.g. cancel)
router.patch("/requests/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const { status } = req.body as { status?: string };
    if (!status) { res.status(400).json({ error: "status is required" }); return; }

    const [updated] = await db
      .update(serviceRequests)
      .set({ status: status as any, updated_at: new Date() })
      .where(and(eq(serviceRequests.id, id), eq(serviceRequests.customer_id, req.userId!)))
      .returning();

    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
