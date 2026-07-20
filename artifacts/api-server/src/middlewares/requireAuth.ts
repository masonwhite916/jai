import type { Request, Response, NextFunction } from "express";
import { db, users } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";

// Extend Express Request via global namespace augmentation
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: number;
      userRole?: string;
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
  const token = auth.slice(7);
  try {
    const now = new Date();
    const rows = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(
        and(
          eq(users.auth_token, token),
          gt(users.token_expires_at, now),
        ),
      )
      .limit(1);

    if (!rows.length) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    req.userId   = rows[0].id;
    req.userRole = rows[0].role;
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
}
