import { Router, type IRouter } from "express";
import { db, chatMessages, jobs, serviceRequests, users } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { dispatch } from "../lib/dispatch";

const router: IRouter = Router();

// ── Access-control helper ────────────────────────────────────────────────────
async function canAccessJobChat(
  jobId: number,
  userId: number,
  userRole: string,
): Promise<boolean> {
  const [job] = await db
    .select({ technician_id: jobs.technician_id, request_id: jobs.request_id })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);

  if (!job) return false;

  if (userRole === "technician") {
    return job.technician_id === userId;
  }

  if (userRole === "customer") {
    const [req_] = await db
      .select({ customer_id: serviceRequests.customer_id })
      .from(serviceRequests)
      .where(eq(serviceRequests.id, job.request_id))
      .limit(1);
    return req_?.customer_id === userId;
  }

  return false;
}

// GET /api/jobs/:jobId/messages — load message history (newest-last)
router.get("/jobs/:jobId/messages", requireAuth, async (req, res) => {
  const jobId = Number(req.params.jobId);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job id" }); return; }

  if (!(await canAccessJobChat(jobId, req.userId!, req.userRole!))) {
    res.status(403).json({ error: "Not authorized for this job" });
    return;
  }

  const msgs = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.job_id, jobId))
    .orderBy(asc(chatMessages.created_at))
    .limit(200);

  res.json(msgs);
});

// POST /api/jobs/:jobId/messages — send a message
router.post("/jobs/:jobId/messages", requireAuth, async (req, res) => {
  const jobId = Number(req.params.jobId);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job id" }); return; }

  const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
  if (!text) { res.status(400).json({ error: "text is required" }); return; }
  if (text.length > 1000) { res.status(400).json({ error: "Message too long" }); return; }

  if (!(await canAccessJobChat(jobId, req.userId!, req.userRole!))) {
    res.status(403).json({ error: "Not authorized for this job" });
    return;
  }

  // Fetch sender name for display
  const [sender] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, req.userId!))
    .limit(1);

  const [msg] = await db
    .insert(chatMessages)
    .values({
      job_id:      jobId,
      sender_id:   req.userId!,
      sender_role: req.userRole!,
      sender_name: sender?.name ?? null,
      text,
    })
    .returning();

  // Broadcast to all parties in the job room (customer + technician)
  dispatch.broadcastToRoom(`job:${jobId}`, {
    type:        "chat_message",
    id:          msg.id,
    job_id:      msg.job_id,
    sender_id:   msg.sender_id,
    sender_role: msg.sender_role,
    sender_name: msg.sender_name,
    text:        msg.text,
    created_at:  msg.created_at.toISOString(),
  });

  res.status(201).json(msg);
});

export default router;
