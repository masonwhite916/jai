/**
 * Session token utilities.
 *
 * Raw tokens are random UUIDs returned to the client exactly once.
 * Only the SHA-256 hex digest is stored in the DB, so a stolen DB
 * cannot be used to forge Bearer tokens.
 */
import crypto from "crypto";

const TOKEN_TTL_DAYS = 30;

/** Generate a cryptographically random opaque token. */
export function generateToken(): string {
  return crypto.randomUUID();
}

/** SHA-256 hex digest of a raw token — what we store in user_sessions. */
export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Expiry date for a new session (30 days from now). */
export function tokenExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + TOKEN_TTL_DAYS);
  return d;
}
