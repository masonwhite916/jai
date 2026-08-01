import { Router, type IRouter } from "express";
import { db, serviceRequests, jobs, users } from "@workspace/db";
import { eq, desc, and, isNotNull } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { dispatch } from "../lib/dispatch";
import { notifyTechniciansNewJob } from "../lib/pushNotifications";
import { moyasarFetch } from "../lib/moyasarClient";

const router: IRouter = Router();

/** Services covered (free) under each subscription plan — mirrors the app. */
const PLAN_COVERED: Record<string, string[]> = {
  basic:     ["battery", "fuel", "tire", "tow", "mechanic", "electric"],
  accidents: ["battery", "fuel", "tire", "tow", "mechanic", "electric"],
  rental:    ["battery", "fuel", "tire", "tow", "mechanic", "electric"],
  premium:   ["battery", "fuel", "tire", "tow", "mechanic", "electric", "lockout"],
};

// POST /api/requests  — create a new service request
router.post("/requests", requireAuth, async (req, res) => {
  try {
    const {
      service_type, vehicle_make, vehicle_model, vehicle_year,
      vehicle_plate, vehicle_color, location_lat, location_lng, address, notes, photo_urls,
      payment_id, cash_intent,
    } = req.body as {
      service_type: string;
      vehicle_make?: string; vehicle_model?: string; vehicle_year?: string;
      vehicle_plate?: string; vehicle_color?: string;
      location_lat?: number; location_lng?: number;
      address?: string; notes?: string; photo_urls?: string;
      payment_id?: string;
      cash_intent?: boolean;
    };

    if (!service_type) {
      res.status(400).json({ error: "service_type is required" });
      return;
    }

    const PAYOUTS: Record<string, number> = {
      battery: 120, fuel: 80, tire: 350, tow: 500, lockout: 200,
      mechanic: 300, electric: 280,
    };

    // ── Payment validation for non-members ────────────────────────────────────
    const [userRow] = await db
      .select({ membership: users.membership })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    const membership = userRow?.membership ?? "none";
    const coveredServices = PLAN_COVERED[membership] ?? [];
    const isCovered = membership !== "none" && coveredServices.includes(service_type);

    let resolvedPaymentMethod: string;

    if (isCovered) {
      // Member — no payment needed
      resolvedPaymentMethod = "covered";
    } else if (cash_intent === true) {
      // Cash on delivery — accepted as-is
      resolvedPaymentMethod = "cash";
    } else if (payment_id) {
      // Verify the Moyasar payment is actually paid, bound to this user, and covers this service
      try {
        const payment = (await moyasarFetch("GET", `/payments/${payment_id}`)) as {
          status: string;
          amount: number;
          metadata?: { type?: string; service_type?: string; user_id?: string };
        };

        if (payment.status !== "paid") {
          res.status(402).json({
            error: `Payment not completed (status: ${payment.status}). Please retry.`,
          });
          return;
        }

        // MANDATORY: payment must be a service payment (not a subscription or other flow)
        if (payment.metadata?.type !== "service") {
          res.status(403).json({ error: "Invalid payment type for service requests." });
          return;
        }

        // MANDATORY: payment must be bound to this authenticated user
        if (!payment.metadata.user_id || payment.metadata.user_id !== String(req.userId)) {
          res.status(403).json({ error: "Payment does not belong to this account." });
          return;
        }

        // MANDATORY: payment must be for exactly this service type
        if (!payment.metadata.service_type || payment.metadata.service_type !== service_type) {
          res.status(402).json({
            error: `Payment was for '${payment.metadata.service_type ?? "unknown"}', not '${service_type}'.`,
          });
          return;
        }

        // Amount sanity-check: payment must cover the full service cost in halalas (SAR × 100)
        const expectedHalalas = (PAYOUTS[service_type] ?? 0) * 100;
        if (payment.amount < expectedHalalas) {
          res.status(402).json({ error: "Payment amount is less than the service cost." });
          return;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Payment verification failed";
        res.status(402).json({ error: `Could not verify payment: ${msg}` });
        return;
      }
      resolvedPaymentMethod = "card";
    } else {
      // Non-member with no payment — reject
      res.status(402).json({
        error: "Payment required. Please complete payment before requesting service.",
      });
      return;
    }

    // Create the service request (payment_id has a UNIQUE constraint — prevents replay attacks)
    let req_: (typeof serviceRequests.$inferSelect);
    try {
      const rows = await db
        .insert(serviceRequests)
        .values({
          customer_id:    req.userId!,
          service_type:   service_type as any,
          vehicle_make, vehicle_model, vehicle_year,
          vehicle_plate, vehicle_color,
          location_lat, location_lng, address, notes,
          photo_urls,
          payment_id:     payment_id ?? null,
          payment_method: resolvedPaymentMethod,
        })
        .returning();
      req_ = rows[0];
    } catch (err: unknown) {
      // Unique constraint violation — payment_id already used for another request
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("unique") || msg.includes("duplicate")) {
        res.status(409).json({ error: "This payment has already been used for another request." });
        return;
      }
      throw err; // re-throw unexpected errors
    }

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
        notes:        notes         ?? null,
        photo_urls:   photo_urls    ?? null,
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

// GET /api/payments — completed-service payment history for the current customer
router.get("/payments", requireAuth, async (req, res) => {
  try {
    // Single query: join the most-recent completed job to get the payout.
    // Only service_requests with status='completed' are returned so users
    // never see a receipt before the service is finished.
    const rows = await db
      .select({
        id:             serviceRequests.id,
        service_type:   serviceRequests.service_type,
        created_at:     serviceRequests.created_at,
        payment_id:     serviceRequests.payment_id,
        payment_method: serviceRequests.payment_method,
        address:        serviceRequests.address,
        payout:         jobs.payout,
      })
      .from(serviceRequests)
      .leftJoin(jobs, eq(jobs.request_id, serviceRequests.id))
      .where(
        and(
          eq(serviceRequests.customer_id, req.userId!),
          eq(serviceRequests.status, "completed"),
          isNotNull(serviceRequests.payment_method),
        ),
      )
      .orderBy(desc(serviceRequests.created_at));

    const PAYOUTS: Record<string, number> = {
      battery: 120, fuel: 80, tire: 350, tow: 500, lockout: 200, mechanic: 300, electric: 280,
    };

    // De-duplicate: a request may have multiple job rows after a left-join;
    // collapse to one entry per request, preferring the highest payout seen.
    const seen = new Map<number, (typeof rows)[0]>();
    for (const row of rows) {
      const existing = seen.get(row.id);
      if (!existing || (row.payout ?? 0) > (existing.payout ?? 0)) {
        seen.set(row.id, row);
      }
    }

    const payments = Array.from(seen.values()).map((r) => ({
      id:             r.id,
      service_type:   r.service_type,
      created_at:     r.created_at,
      payment_id:     r.payment_id,
      payment_method: r.payment_method,
      address:        r.address,
      amount:         r.payout ?? PAYOUTS[r.service_type] ?? 0,
    }));

    // Maintain descending chronological order after Map de-dup
    payments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({ payments });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
