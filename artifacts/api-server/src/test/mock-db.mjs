/**
 * Configurable mock for @workspace/db used by the dispatch integration tests.
 *
 * Each DB query call pulls the next result from the queue via `queueResult()`.
 * Tests push their expected rows before exercising the server.
 *
 * The module loader hook (hooks.mjs / loader.mjs) redirects every import of
 * "@workspace/db" to this file so dispatch.ts gets the mock instead of the
 * real Postgres-backed db.
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

// Minimal drizzle-style query builder — chains are ignored; .limit() resolves
// with the next queued result (or [] if the queue is empty).
const makeBuilder = () => ({
  from:  () => makeBuilder(),
  where: () => makeBuilder(),
  limit: () => Promise.resolve(_queue.shift() ?? []),
});

export const db = {
  select: () => makeBuilder(),
};

// Table references — passed as arguments to the builder but never inspected by
// the mock, so empty objects are sufficient.
export const users          = {};
export const jobs           = {};
export const serviceRequests = {};

// pool.end() is called by teardown helpers in some setups.
export const pool = { end: () => Promise.resolve() };
