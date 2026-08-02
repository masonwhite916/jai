/**
 * In-memory stub for adminSessions.ts used by the dispatch integration tests.
 *
 * Restores the original synchronous behaviour so tests do not need to queue
 * DB results for every session create/validate call.  Sessions are stored in
 * a plain Map and expire based on wall-clock time.
 */

import { randomUUID } from "node:crypto";

/** token → { token, expiresAt } */
const _sessions = new Map();

/** Create a session and return it synchronously (no DB round-trip). */
export function createAdminSession() {
  const token     = `admin_${randomUUID()}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  _sessions.set(token, { token, expiresAt });
  return { token, expiresAt };
}

/** Validate a token synchronously (no DB round-trip). */
export function validateAdminToken(token) {
  const session = _sessions.get(token);
  if (!session) return false;
  if (session.expiresAt <= new Date()) {
    _sessions.delete(token);
    return false;
  }
  return true;
}

/** Clear all sessions — call from test teardown if needed. */
export function clearAdminSessions() {
  _sessions.clear();
}
