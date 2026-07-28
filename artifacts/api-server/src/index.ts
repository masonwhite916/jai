import { createServer } from "http";
import app from "./app";
import { dispatch } from "./lib/dispatch";
import { logger } from "./lib/logger";
import { runStartupChecks } from "./lib/startupChecks";
import { warmTechLocationsFromDb } from "./lib/techLocations";
import { migrateLegacySettingsFile } from "./lib/siteSettings";
import { db, userSessions } from "@workspace/db";
import { lt, or, isNotNull, and } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Warn about missing optional service credentials before accepting traffic
runStartupChecks();

// Create an explicit HTTP server so we can attach the WebSocket dispatch server
// to the same port without opening a second TCP socket.
const server = createServer(app);
dispatch.attach(server);

server.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Warm in-memory tech location cache from DB (non-blocking)
  warmTechLocationsFromDb().catch((e) =>
    logger.warn({ err: e }, "warmTechLocationsFromDb failed"),
  );

  // One-time migration: import legacy siteSettings.json → DB if it exists
  migrateLegacySettingsFile().catch((e) =>
    logger.warn({ err: e }, "migrateLegacySettingsFile failed"),
  );
});

// ── Hourly cleanup: remove expired/revoked sessions older than 30 days ────────
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

setInterval(async () => {
  try {
    const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);
    await db.delete(userSessions).where(
      or(
        lt(userSessions.expires_at, new Date()),
        and(isNotNull(userSessions.revoked_at), lt(userSessions.created_at, cutoff)),
      ),
    );
  } catch { /* non-fatal — next tick will retry */ }
}, 60 * 60 * 1000).unref();
