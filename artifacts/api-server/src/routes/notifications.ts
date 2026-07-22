/**
 * Notification history routes.
 *
 * GET  /api/notifications        — paginated list for the authenticated user
 * PATCH /api/notifications/:id/read — mark a single notification as read
 * POST  /api/notifications/read-all — mark all as read
 */

import { Router, type IRouter } from "express";
import { db, notifications } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// GET /api/notifications
router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const userId = (req as typeof req & { userId: number }).userId;
    const limit  = Math.min(Number(req.query.limit ?? 50), 100);
    const offset = Number(req.query.offset ?? 0);

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.user_id, userId))
      .orderBy(desc(notifications.created_at))
      .limit(limit)
      .offset(offset);

    res.json({ notifications: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// PATCH /api/notifications/:id/read
router.patch("/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const userId = (req as typeof req & { userId: number }).userId;
    const id     = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.user_id, userId)));

    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// POST /api/notifications/read-all
router.post("/notifications/read-all", requireAuth, async (req, res) => {
  try {
    const userId = (req as typeof req & { userId: number }).userId;

    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.user_id, userId));

    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
