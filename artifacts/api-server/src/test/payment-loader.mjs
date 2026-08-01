/**
 * ESM loader for payment gate tests.
 * Intercepts both @workspace/db and the Moyasar client.
 */

import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_DB_URL      = new URL("./mock-payment-db.mjs",   import.meta.url).href;
const MOCK_MOYASAR_URL = new URL("./mock-moyasar.mjs",      import.meta.url).href;
const MOCK_AUTH_URL    = new URL("./mock-require-auth.mjs", import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@workspace/db") {
    return { url: MOCK_DB_URL, shortCircuit: true };
  }
  // Intercept the Moyasar client wherever it is imported from
  if (specifier.endsWith("/moyasarClient") || specifier.endsWith("/moyasarClient.ts")) {
    return { url: MOCK_MOYASAR_URL, shortCircuit: true };
  }
  // Intercept requireAuth so tests don't need real JWT tokens
  if (specifier.endsWith("/requireAuth") || specifier.endsWith("/requireAuth.ts")) {
    return { url: MOCK_AUTH_URL, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
