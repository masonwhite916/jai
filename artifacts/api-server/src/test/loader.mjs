/**
 * ESM customization hook — intercepts "@workspace/db" and redirects it to the
 * in-process mock so dispatch.ts never tries to open a real Postgres connection.
 *
 * Registered by hooks.mjs via `node:module` register().
 */

import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_DB_URL            = new URL("./mock-db.mjs",             import.meta.url).href;
const MOCK_ADMIN_SESSION_URL = new URL("./mock-admin-sessions.mjs", import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@workspace/db") {
    return { url: MOCK_DB_URL, shortCircuit: true };
  }
  // Intercept the DB-backed admin session store and replace with an in-memory
  // stub so tests don't need to queue DB results for every create/validate call.
  if (specifier.endsWith("/adminSessions") || specifier.endsWith("/adminSessions.ts")) {
    return { url: MOCK_ADMIN_SESSION_URL, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
