/**
 * ESM loader for push-notification unit tests.
 * Intercepts @workspace/db and redirects it to the in-process mock.
 */

const MOCK_DB_URL = new URL("./mock-push-db.mjs", import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@workspace/db") {
    return { url: MOCK_DB_URL, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
