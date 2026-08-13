/**
 * ESM loader for push-notification unit tests.
 * Intercepts @workspace/db and redirects it to the in-process mock.
 * Also intercepts drizzle-orm so that eq(column, value) returns `value`
 * directly — this lets the mock db.update builder capture which push token
 * was passed to .where() without needing real SQL objects.
 */

const MOCK_DB_URL      = new URL("./mock-push-db.mjs",      import.meta.url).href;
const MOCK_DRIZZLE_URL = new URL("./mock-drizzle-orm.mjs",  import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@workspace/db") {
    return { url: MOCK_DB_URL, shortCircuit: true };
  }
  if (specifier === "drizzle-orm") {
    return { url: MOCK_DRIZZLE_URL, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
