/**
 * DB-backed session tokens.
 * Token = crypto.randomUUID(); stored in users.auth_token.
 * No external packages needed.
 */
import crypto from "crypto";

const TOKEN_TTL_DAYS = 90;

export function generateToken(): string {
  return crypto.randomUUID();
}

export function tokenExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + TOKEN_TTL_DAYS);
  return d;
}
