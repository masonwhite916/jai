import { createServer } from "http";
import app from "./app";
import { dispatch } from "./lib/dispatch";
import { logger } from "./lib/logger";
import { warmTechLocationsFromDb } from "./lib/techLocations";
import { migrateLegacySettingsFile } from "./lib/siteSettings";

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
