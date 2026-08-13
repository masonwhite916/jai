/**
 * Minimal drizzle-orm mock for push-notification tests.
 *
 * eq(column, value) returns the value directly so the mock update builder
 * can capture which token was passed to .where() without needing real SQL
 * objects.
 */

export function eq(_col, value) {
  return value;
}

export function isNotNull(_col) {
  return true;
}

export function ne(_col, _value) {
  return true;
}
