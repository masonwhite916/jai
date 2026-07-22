import type { Request, Response, NextFunction } from "express";
import { db, users, userSessions } from "@workspace/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import { hashToken } from "../lib/tokenAuth";

// Extend Express Request via global namespace augmentation
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?:    number;
      userRole?:  string;
      sessionId?: number;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const raw  = auth.slice(7);
  const hash = hashToken(raw);

  try {
    const now = new Date();

    const rows = await db
      .select({
        session_id: userSessions.id,
        user_id:    userSessions.user_id,
        role:       users.role,
      })
      .from(userSessions)
      .innerJoin(users, eq(users.id, userSessions.user_id))
      .where(
        and(
          eq(userSessions.token_hash, hash),
          gt(userSessions.expires_at, now),
          isNull(userSessions.revoked_at),
        ),
      )
      .limit(1);

    if (!rows.length) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const row = rows[0];
    req.userId    = row.user_id;
    req.userRole  = row.role;
    req.sessionId = row.session_id;

    // Update last_used_at (fire-and-forget — never block the request)
    db.update(userSessions)
      .set({ last_used_at: now })
      .where(eq(userSessions.id, row.session_id))
      .catch(() => {});

    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
}
