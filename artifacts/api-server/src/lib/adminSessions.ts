/**
 * DB-backed admin session store.
 *
 * Sessions survive server restarts. Each token is valid for 24 hours.
 * Expired sessions are cleaned up lazily on each validation call and
 * by a periodic background job.
 */

import { randomUUID } from "crypto";
import { db, adminSessions } from "@workspace/db";
import { eq, lt } from "drizzle-orm";

export interface AdminSession {
  token:     string;
  expiresAt: Date;
}

/** Create a new admin session and persist it to the DB. */
export async function createAdminSession(): Promise<AdminSession> {
  const token     = `admin_${randomUUID()}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 h

  await db.insert(adminSessions).values({ token, expires_at: expiresAt });
  return { token, expiresAt };
}

/** Return true if the token exists in the DB and has not expired. */
export async function validateAdminToken(token: string): Promise<boolean> {
  const now = new Date();
  const rows = await db
    .select({ token: adminSessions.token })
    .from(adminSessions)
    .where(eq(adminSessions.token, token))
    .limit(1);

  if (!rows.length) return false;

  // Check expiry — delete inline if expired
  const [row] = await db
    .select({ expires_at: adminSessions.expires_at })
    .from(adminSessions)
    .where(eq(adminSessions.token, token))
    .limit(1);

  if (!row || row.expires_at <= now) {
    await db.delete(adminSessions).where(eq(adminSessions.token, token));
    return false;
  }

  return true;
}

// Periodically evict expired sessions to avoid unbounded table growth.
setInterval(
  async () => {
    try {
      await db.delete(adminSessions).where(lt(adminSessions.expires_at, new Date()));
    } catch { /* ignore — next tick will retry */ }
  },
  60 * 60 * 1000, // every hour
).unref();
