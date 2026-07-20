import { Router, type IRouter } from "express";
import { db, jobs, serviceRequests, users } from "@workspace/db";
import { eq, and, inArray, desc, isNull, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { dispatch } from "../lib/dispatch";
import { notifyCustomerJobAccepted, notifyCustomerJobCompleted } from "../lib/pushNotifications";

const router: IRouter = Router();

// ── Allowed status transitions (from → allowed next states) ──────────────────
const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  pending:    ["accepted", "cancelled"],
  accepted:   ["en_route", "cancelled"],
  en_route:   ["arrived", "cancelled"],
  arrived:    ["working", "cancelled"],
  working:    ["completed", "cancelled"],
  // completed / cancelled are terminal
  completed:  [],
  cancelled:  [],
};

function requireTechnician(req: any, res: any): boolean {
  if (req.userRole !== "technician") {
    res.status(403).json({ error: "Only technicians can access job routes" });
    return false;
  }
  return true;
}

// GET /api/jobs
// ?status=pending → unassigned jobs visible to all technicians (job board)
// ?status=active  → this technician's in-progress jobs
// (no param)      → all of this technician's jobs
router.get("/jobs", requireAuth, async (req, res) => {
  try {
    if (!requireTechnician(req, res)) return;

    const { status } = req.query as { status?: string };

    let jobRows;
    if (status === "pending") {
      jobRows = await db
        .select()
        .from(jobs)
        .where(and(eq(jobs.status, "pending"), isNull(jobs.technician_id)))
        .orderBy(desc(jobs.created_at))
        .limit(20);
    } else if (status === "active") {
      jobRows = await db
        .select()
        .from(jobs)
        .where(
          and(
            eq(jobs.technician_id, req.userId!),
            inArray(jobs.status, ["accepted", "en_route", "arrived", "working"]),
          ),
        )
        .orderBy(desc(jobs.created_at))
        .limit(1);
    } else {
      jobRows = await db
        .select()
        .from(jobs)
        .where(eq(jobs.technician_id, req.userId!))
        .orderBy(desc(jobs.created_at))
        .limit(50);
    }

    // Enrich with request + customer info
    const enriched = await Promise.all(
      jobRows.map(async (j) => {
        const [req_] = await db
          .select()
          .from(serviceRequests)
          .where(eq(serviceRequests.id, j.request_id))
          .limit(1);

        let customer: { name: string | null; phone: string } | null = null;
        if (req_) {
          const [c] = await db
            .select({ name: users.name, phone: users.phone })
            .from(users)
            .where(eq(users.id, req_.customer_id))
            .limit(1);
          customer = c ?? null;
        }

        return { ...j, request: req_ ?? null, customer };
      }),
    );

    res.json({ jobs: enriched });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// PATCH /api/jobs/:id  — advance a job to the next status
router.patch("/jobs/:id", requireAuth, async (req, res) => {
  try {
    if (!requireTechnician(req, res)) return;

    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const { status } = req.body as { status?: string };
    if (!status) { res.status(400).json({ error: "status is required" }); return; }

    // Fetch the job
    const [existing] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, id))
      .limit(1);

    if (!existing) { res.status(404).json({ error: "Job not found" }); return; }

    // Role / ownership guard:
    // - A pending/unassigned job can only be accepted (assign to self)
    // - All subsequent transitions must be made by the assigned technician
    // For non-accept transitions: must be the assigned technician
    if (status !== "accepted" && existing.technician_id !== req.userId) {
      res.status(403).json({ error: "Not your job" });
      return;
    }

    // Validate transition
    const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(status)) {
      res.status(422).json({
        error: `Cannot transition from '${existing.status}' to '${status}'. Allowed: [${allowed.join(", ")}]`,
      });
      return;
    }

    const updates: Record<string, unknown> = { status, updated_at: new Date() };

    if (status === "accepted") {
      // Atomic acceptance: UPDATE only if still pending and unassigned.
      // This prevents a TOCTOU race where two technicians accept the same job.
      const accepted = await db
        .update(jobs)
        .set({
          status:        "accepted",
          technician_id: req.userId,
          accepted_at:   new Date(),
          updated_at:    new Date(),
        })
        .where(
          and(
            eq(jobs.id, id),
            eq(jobs.status, "pending"),
            isNull(jobs.technician_id),
          ),
        )
        .returning();

      if (!accepted.length) {
        res.status(409).json({ error: "Job already accepted by another technician" });
        return;
      }

      await db
        .update(serviceRequests)
        .set({ status: "assigned", updated_at: new Date() })
        .where(eq(serviceRequests.id, existing.request_id));

      // Fetch technician info for the real-time broadcast
      const [tech] = await db
        .select({ name: users.name, phone: users.phone, rating: users.rating })
        .from(users)
        .where(eq(users.id, req.userId!))
        .limit(1);

      // Broadcast to the job room (keyed by job ID for consistency with location relay)
      dispatch.broadcastToRoom(`job:${id}`, {
        type:       "job_accepted",
        jobId:      id,
        requestId:  existing.request_id,
        status:     "accepted",
        techId:     req.userId,
        techName:   tech?.name   ?? "Technician",
        techPhone:  tech?.phone  ?? "",
        techRating: tech?.rating ?? 4.5,
      });

      // Fetch customer_id from the service request so we can push to them
      const [sreq] = await db
        .select({ customer_id: serviceRequests.customer_id, service_type: serviceRequests.service_type })
        .from(serviceRequests)
        .where(eq(serviceRequests.id, existing.request_id))
        .limit(1);

      if (sreq) {
        void notifyCustomerJobAccepted({
          customerId:  sreq.customer_id,
          techName:    tech?.name ?? "Technician",
          serviceType: sreq.service_type,
          jobId:       id,
          requestId:   existing.request_id,
        });
      }

      res.json(accepted[0]);
      return; // already responded
    }

    if (status === "working") {
      await db
        .update(serviceRequests)
        .set({ status: "in_progress", updated_at: new Date() })
        .where(eq(serviceRequests.id, existing.request_id));
    }

    if (status === "completed") {
      updates.completed_at = new Date();
      const [completedReq] = await db
        .update(serviceRequests)
        .set({ status: "completed", updated_at: new Date() })
        .where(eq(serviceRequests.id, existing.request_id))
        .returning();
      // Atomically credit the assigned technician's earnings
      await db
        .update(users)
        .set({
          jobs_completed: sql`${users.jobs_completed} + 1`,
          earnings_total: sql`${users.earnings_total} + ${existing.payout}`,
          updated_at:     new Date(),
        })
        .where(eq(users.id, req.userId!));

      if (completedReq) {
        void notifyCustomerJobCompleted({
          customerId:  completedReq.customer_id,
          serviceType: completedReq.service_type,
          payout:      existing.payout,
          requestId:   existing.request_id,
        });
      }
    }

    if (status === "cancelled") {
      await db
        .update(serviceRequests)
        .set({ status: "cancelled", updated_at: new Date() })
        .where(eq(serviceRequests.id, existing.request_id));
    }

    const [updated] = await db
      .update(jobs)
      .set(updates)
      .where(eq(jobs.id, id))
      .returning();

    // Real-time notification to the customer and any other listeners on this job
    // Room key is the job ID (consistent with location relay and accept broadcast)
    dispatch.broadcastToRoom(`job:${id}`, {
      type:      "job_status",
      jobId:     id,
      requestId: existing.request_id,
      status,
    });

    res.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
