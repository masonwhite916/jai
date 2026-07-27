import { Router, type IRouter } from "express";
import { db, jobs, jobRatings, users } from "@workspace/db";
import { eq, and, avg } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// POST /api/jobs/:jobId/rate
// Submit a 1-5 star rating for the other party (customer rates tech, tech rates customer).
router.post("/jobs/:jobId/rate", requireAuth, async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId as string, 10);
    if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job id" }); return; }

    const { stars, comment } = req.body as { stars: number; comment?: string };
    if (!stars || stars < 1 || stars > 5) {
      res.status(400).json({ error: "stars must be 1–5" }); return;
    }

    // Load job with request + technician
    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId));

    if (!job) { res.status(404).json({ error: "Job not found" }); return; }
    if (job.status !== "completed") {
      res.status(400).json({ error: "Job is not completed yet" }); return;
    }

    const raterId = req.userId!;
    const raterRole = req.userRole as string;

    // Determine the ratee: customer rates tech, tech rates customer
    let rateeId: number | null = null;
    if (raterRole === "customer") {
      rateeId = job.technician_id ?? null;
    } else if (raterRole === "technician") {
      // Get customer_id from the service request
      const { db: _db, serviceRequests } = await import("@workspace/db");
      const [req_] = await _db
        .select({ customer_id: serviceRequests.customer_id })
        .from(serviceRequests)
        .where(eq(serviceRequests.id, job.request_id));
      rateeId = req_?.customer_id ?? null;
    }

    if (!rateeId) { res.status(400).json({ error: "Could not determine ratee" }); return; }

    // Prevent duplicate ratings
    const [existing] = await db
      .select({ id: jobRatings.id })
      .from(jobRatings)
      .where(and(eq(jobRatings.job_id, jobId), eq(jobRatings.rater_id, raterId)));

    if (existing) {
      res.status(409).json({ error: "Already rated this job" }); return;
    }

    // Insert rating
    await db.insert(jobRatings).values({
      job_id:     jobId,
      rater_id:   raterId,
      ratee_id:   rateeId,
      rater_role: raterRole,
      stars:      Math.round(stars),
      comment:    comment?.trim() || null,
    });

    // Recalculate and update the ratee's average rating
    const [avgRow] = await db
      .select({ avg: avg(jobRatings.stars) })
      .from(jobRatings)
      .where(eq(jobRatings.ratee_id, rateeId));

    const newAvg = avgRow?.avg ? parseFloat(String(avgRow.avg)) : stars;
    await db
      .update(users)
      .set({ rating: newAvg })
      .where(eq(users.id, rateeId));

    res.json({ ok: true, newAvg });
  } catch (err) {
    console.error("[ratings] POST error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/jobs/:jobId/rating
// Check whether the calling user has already submitted a rating for this job.
router.get("/jobs/:jobId/rating", requireAuth, async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId as string, 10);
    if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job id" }); return; }

    const [existing] = await db
      .select()
      .from(jobRatings)
      .where(and(eq(jobRatings.job_id, jobId), eq(jobRatings.rater_id, req.userId!)));

    res.json({ rated: !!existing, rating: existing ?? null });
  } catch (err) {
    console.error("[ratings] GET error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
