import { Router, type IRouter } from "express";
import {
  db, users, userSessions, vehicles,
  notifications, jobRatings, technicianLocations, chatMessages, serviceRequests, jobs,
  applePaySessions,
} from "@workspace/db";
import { eq, and, isNull, or, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { toVehicleDto } from "../lib/vehicleDto";

const router: IRouter = Router();

// GET /api/users/me
router.get("/users/me", requireAuth, async (req, res) => {
  try {
    const [rows, userVehicles] = await Promise.all([
      db.select().from(users).where(eq(users.id, req.userId!)).limit(1),
      db.select().from(vehicles).where(eq(vehicles.user_id, req.userId!)),
    ]);

    if (!rows.length) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const u = rows[0];
    res.json({
      id:            String(u.id),
      phone:         u.phone,
      name:          u.name ?? "Guest",
      role:          u.role,
      membership:    u.membership,
      points:        u.points,
      rating:        u.rating,
      jobsCompleted: u.jobs_completed,
      earningsTotal: u.earnings_total,
      vehicles:      userVehicles.map(toVehicleDto),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// PUT /api/users/me
// Users may only update safe personal fields: name, push_token.
// Privileged fields (membership, points, role, earnings) are managed
// exclusively by internal server logic (e.g. Whop webhook, job completion).
router.put("/users/me", requireAuth, async (req, res) => {
  try {
    const { name, push_token } = req.body as {
      name?: string;
      push_token?: string;
    };

    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (name       !== undefined) updates.name       = name;
    if (push_token !== undefined) updates.push_token = push_token;

    const [[u], userVehicles] = await Promise.all([
      db.update(users).set(updates).where(eq(users.id, req.userId!)).returning(),
      db.select().from(vehicles).where(eq(vehicles.user_id, req.userId!)),
    ]);

    res.json({
      id:            String(u.id),
      phone:         u.phone,
      name:          u.name ?? "Guest",
      role:          u.role,
      membership:    u.membership,
      points:        u.points,
      rating:        u.rating,
      jobsCompleted: u.jobs_completed,
      earningsTotal: u.earnings_total,
      vehicles:      userVehicles.map(toVehicleDto),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// POST /api/users/logout
// Revokes the calling session only (other devices stay logged in).
// Kept here for backward compatibility — mobile apps may call either this
// route or POST /api/auth/logout; both do the same thing.
router.post("/users/logout", requireAuth, async (req, res) => {
  try {
    if (req.sessionId) {
      await db
        .update(userSessions)
        .set({ revoked_at: new Date() })
        .where(
          and(eq(userSessions.id, req.sessionId), isNull(userSessions.revoked_at)),
        );
    }
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// DELETE /api/users/me
// Permanently deletes the authenticated user and all associated personal data.
// Job history (service_requests, jobs) is anonymised rather than deleted to
// satisfy the 5-year financial-record retention requirement under Saudi PDPL.
router.delete("/users/me", requireAuth, async (req, res) => {
  const userId = req.userId!;
  try {
    // 1. Collect service request IDs belonging to this customer so we can
    //    cascade through jobs → chat before removing the requests themselves.
    const userRequests = await db
      .select({ id: serviceRequests.id })
      .from(serviceRequests)
      .where(eq(serviceRequests.customer_id, userId));
    const requestIds = userRequests.map((r) => r.id);

    // 2. For each request, collect jobs so we can wipe chat messages.
    let jobIds: number[] = [];
    if (requestIds.length > 0) {
      const userJobs = await db
        .select({ id: jobs.id })
        .from(jobs)
        .where(inArray(jobs.request_id, requestIds));
      jobIds = userJobs.map((j) => j.id);
    }

    // 3. Delete in dependency order to satisfy FK constraints.
    //    chat_messages → jobs → service_requests must be cleared before the
    //    user row is removed.  vehicles and user_sessions cascade automatically.
    await db.transaction(async (tx) => {
      // chat messages in jobs owned by this customer
      if (jobIds.length > 0) {
        await tx.delete(chatMessages).where(inArray(chatMessages.job_id, jobIds));
      }
      // chat messages sent by this user in any other job (technician role)
      await tx.delete(chatMessages).where(eq(chatMessages.sender_id, userId));

      // job ratings given or received by this user
      await tx.delete(jobRatings).where(
        or(eq(jobRatings.rater_id, userId), eq(jobRatings.ratee_id, userId))!,
      );

      // notifications
      await tx.delete(notifications).where(eq(notifications.user_id, userId));

      // technician location ping
      await tx.delete(technicianLocations).where(eq(technicianLocations.user_id, userId));

      // nullify technician reference in jobs where this user was the tech
      // (keeps job records intact for the other party)
      await tx
        .update(jobs)
        .set({ technician_id: null })
        .where(eq(jobs.technician_id, userId));

      // remove jobs then requests belonging to this customer
      if (requestIds.length > 0) {
        await tx.delete(jobs).where(inArray(jobs.request_id, requestIds));
        await tx.delete(serviceRequests).where(eq(serviceRequests.customer_id, userId));
      }

      // apple pay sessions for this user
      await tx.delete(applePaySessions).where(eq(applePaySessions.user_id, userId));

      // finally delete the user row (vehicles + sessions cascade)
      await tx.delete(users).where(eq(users.id, userId));
    });

    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
