/**
 * In-memory admin session store.
 *
 * Tokens are lost on server restart (intentional — admins re-login).
 * Each session is valid for 24 hours.
 */

import { randomUUID } from "crypto";

interface AdminSession {
  token: string;
  expiresAt: Date;
}

const sessions = new Map<string, AdminSession>();

// Periodically evict expired sessions to avoid unbounded growth.
setInterval(
  () => {
    const now = new Date();
    for (const [token, session] of sessions.entries()) {
      if (session.expiresAt <= now) sessions.delete(token);
    }
  },
  60 * 60 * 1000, // run every hour
).unref();

/** Create a new admin session and return its token + expiry. */
export function createAdminSession(): AdminSession {
  const token = `admin_${randomUUID()}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 h
  sessions.set(token, { token, expiresAt });
  return { token, expiresAt };
}

/** Return true if the token is valid and not expired. */
export function validateAdminToken(token: string): boolean {
  const session = sessions.get(token);
  if (!session) return false;
  if (session.expiresAt <= new Date()) {
    sessions.delete(token);
    return false;
  }
  return true;
}
