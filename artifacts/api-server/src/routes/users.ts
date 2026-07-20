import { Router, type IRouter } from "express";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// GET /api/users/me
router.get("/users/me", requireAuth, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

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
      vehicles:      [],
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

    const [u] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, req.userId!))
      .returning();

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
      vehicles:      [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// POST /api/users/logout
router.post("/users/logout", requireAuth, async (req, res) => {
  try {
    await db
      .update(users)
      .set({ auth_token: null, token_expires_at: null, updated_at: new Date() })
      .where(eq(users.id, req.userId!));
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
