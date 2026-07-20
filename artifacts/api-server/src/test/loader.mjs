/**
 * ESM customization hook — intercepts "@workspace/db" and redirects it to the
 * in-process mock so dispatch.ts never tries to open a real Postgres connection.
 *
 * Registered by hooks.mjs via `node:module` register().
 */

import { fileURLToPath } from "node:url";
import { resolve as pathResolve, dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_DB_URL = new URL("./mock-db.mjs", import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@workspace/db") {
    return { url: MOCK_DB_URL, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
