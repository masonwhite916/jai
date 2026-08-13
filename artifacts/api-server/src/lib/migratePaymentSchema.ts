/**
 * Idempotent payment-schema migration.
 *
 * Adds the columns / tables introduced by the pre-dispatch payment gate.
 * Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS so it is safe to run on
 * every server start — including fresh environments and production.
 *
 * Called from index.ts before the server starts accepting traffic.
 */

import { pool } from "@workspace/db";
import { logger } from "./logger";

export async function migratePaymentSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    // ── service_requests: payment columns ────────────────────────────────────
    await client.query(`
      ALTER TABLE service_requests
        ADD COLUMN IF NOT EXISTS payment_id           text UNIQUE,
        ADD COLUMN IF NOT EXISTS payment_method       text,
        ADD COLUMN IF NOT EXISTS promo_code           text,
        ADD COLUMN IF NOT EXISTS discount_amount      integer,
        ADD COLUMN IF NOT EXISTS final_amount_halalas integer
    `);

    // ── service_payment_refs: webhook → poll bridge ───────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS service_payment_refs (
        ref        text PRIMARY KEY,
        payment_id text NOT NULL,
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    // ── applepay_sessions: auth-protected session tokens ─────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS applepay_sessions (
        token        text PRIMARY KEY,
        user_id      integer NOT NULL REFERENCES users(id),
        service_type text NOT NULL,
        ref          text NOT NULL,
        expires_at   timestamptz NOT NULL,
        created_at   timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    // ── promo_uses: per-user single-use enforcement ───────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS promo_uses (
        id      serial PRIMARY KEY,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code    text NOT NULL,
        used_at timestamptz NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, code)
      )
    `);

    logger.info("migratePaymentSchema: schema up to date");
  } catch (err) {
    logger.error({ err }, "migratePaymentSchema: migration failed");
    throw err;
  } finally {
    client.release();
  }
}
