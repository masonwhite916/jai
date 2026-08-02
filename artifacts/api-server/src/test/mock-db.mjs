/**
 * Configurable mock for @workspace/db used by the dispatch integration tests.
 *
 * Each DB query call pulls the next result from the queue via queueResult().
 * Tests push their expected rows before exercising the server.
 *
 * The module loader hook (hooks.mjs → loader.mjs) redirects every import of
 * "@workspace/db" to this file so dispatch.ts never tries to open a real
 * Postgres connection.
 *
 * db.insert / db.delete / db.update are no-ops so modules that call them at
 * runtime (techLocations, etc.) do not throw.
 */

const _queue = [];

/** Push the next result row(s) for the upcoming db.select…limit(1) call. */
export function queueResult(rows) {
  _queue.push(rows);
}

/** Reset the queue between tests. */
export function resetQueue() {
  _queue.length = 0;
}

// ── Query builders ─────────────────────────────────────────────────────────────

// Minimal drizzle-style select builder — chains are ignored; .limit() resolves
// with the next queued result (or [] if the queue is empty).
const makeSelectBuilder = () => ({
  from:       () => makeSelectBuilder(),
  where:      () => makeSelectBuilder(),
  orderBy:    () => makeSelectBuilder(),
  innerJoin:  () => makeSelectBuilder(),
  leftJoin:   () => makeSelectBuilder(),
  limit:      () => Promise.resolve(_queue.shift() ?? []),
  // Thenable for direct `await builder` (no .limit() call)
  then: (onR, onRej) =>
    Promise.resolve(_queue.shift() ?? []).then(onR, onRej),
});

// No-op builders for write operations — just need to not throw.
const makeNoopBuilder = () => {
  const self = {
    set:                () => self,
    values:             () => self,
    where:              () => self,
    onConflictDoUpdate: () => self,
    returning:          () => Promise.resolve([]),
    catch:              () => Promise.resolve(undefined),
    then: (onR, onRej) => Promise.resolve(undefined).then(onR, onRej),
  };
  return self;
};

export const db = {
  select: () => makeSelectBuilder(),
  insert: () => makeNoopBuilder(),
  update: () => makeNoopBuilder(),
  delete: () => makeNoopBuilder(),
};

// ── Table references ───────────────────────────────────────────────────────────
// Passed as arguments to builders but never inspected by the mock.

export const users               = {};
export const jobs                = {};
export const serviceRequests     = {};
export const technicianLocations = {};
export const adminSessions       = {};
export const userSessions        = {};
export const notifications       = {};
export const siteSettings        = {};
export const vehicles            = {};

// pool.end() is called by teardown helpers in some setups.
export const pool = { end: () => Promise.resolve() };
