/**
 * ESM loader for jobs-route integration tests.
 *
 * Intercepts:
 *   @workspace/db        → mock-jobs-db.mjs
 *   requireAuth          → mock-require-auth-tech.mjs  (role = technician)
 *   lib/dispatch         → mock-dispatch.mjs
 *   lib/pushNotifications → mock-push-notif.mjs
 */

const MOCK_DB_URL    = new URL("./mock-jobs-db.mjs",             import.meta.url).href;
const MOCK_AUTH_URL  = new URL("./mock-require-auth-tech.mjs",   import.meta.url).href;
const MOCK_DISP_URL  = new URL("./mock-dispatch.mjs",            import.meta.url).href;
const MOCK_PUSH_URL  = new URL("./mock-push-notif.mjs",          import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@workspace/db") {
    return { url: MOCK_DB_URL, shortCircuit: true };
  }
  if (specifier.endsWith("/requireAuth") || specifier.endsWith("/requireAuth.ts")) {
    return { url: MOCK_AUTH_URL, shortCircuit: true };
  }
  if (specifier.endsWith("/dispatch") || specifier.endsWith("/dispatch.ts")) {
    return { url: MOCK_DISP_URL, shortCircuit: true };
  }
  if (
    specifier.endsWith("/pushNotifications") ||
    specifier.endsWith("/pushNotifications.ts")
  ) {
    return { url: MOCK_PUSH_URL, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
