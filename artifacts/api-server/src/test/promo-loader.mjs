/**
 * ESM loader for promo-enforcement tests.
 * Intercepts @workspace/db (and /schema), the Moyasar client, and requireAuth.
 */

const MOCK_DB_URL      = new URL("./mock-promo-db.mjs",     import.meta.url).href;
const MOCK_MOYASAR_URL = new URL("./mock-moyasar.mjs",      import.meta.url).href;
const MOCK_AUTH_URL    = new URL("./mock-require-auth.mjs", import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  // Both the main db export and the /schema sub-path map to the same mock
  if (specifier === "@workspace/db" || specifier === "@workspace/db/schema") {
    return { url: MOCK_DB_URL, shortCircuit: true };
  }
  if (specifier.endsWith("/moyasarClient") || specifier.endsWith("/moyasarClient.ts")) {
    return { url: MOCK_MOYASAR_URL, shortCircuit: true };
  }
  if (specifier.endsWith("/requireAuth") || specifier.endsWith("/requireAuth.ts")) {
    return { url: MOCK_AUTH_URL, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
