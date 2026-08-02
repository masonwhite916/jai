/**
 * DB mock for push-notification unit tests.
 *
 * Supports two access patterns used by pushNotifications.ts:
 *   • await db.select(…).from(…).where(…)          — no .limit() call
 *   • await db.select(…).from(…).where(…).limit(1) — with .limit()
 *
 * The builder is a thenable so `await builder` works without .limit(), and
 * .limit() itself returns a plain Promise so that also works.
 * Both patterns consume one entry from the queue.
 *
 * Insert captures: every .values(v) call appends v to _insertedRows.
 * .catch() on the insert chain is supported (returns resolved Promise).
 */

const _selectQueue   = [];
const _insertedRows  = [];

/** Push the next rows that a select/await-chain will resolve with. */
export function queueSelect(rows) {
  _selectQueue.push(rows);
}

/** Return a copy of every row (or array) passed to .values() so far. */
export function getInsertedRows() {
  return [..._insertedRows];
}

/** Reset all state between tests. */
export function resetDb() {
  _selectQueue.length  = 0;
  _insertedRows.length = 0;
}

// ── Query builder ─────────────────────────────────────────────────────────────

function makeSelectBuilder() {
  const self = {
    from:    () => self,
    where:   () => self,
    orderBy: () => self,
    // .limit() returns a plain Promise — consumes next queue entry.
    limit:   ()  => Promise.resolve(_selectQueue.shift() ?? []),
    // Make the builder itself thenable so `await builder` also works.
    then:    (onResolve, onReject) =>
               Promise.resolve(_selectQueue.shift() ?? []).then(onResolve, onReject),
  };
  return self;
}

function makeInsertBuilder() {
  const self = {
    values: (v) => {
      _insertedRows.push(v);
      return self;
    },
    returning: () => Promise.resolve([]),
    // .catch() is called on the result of .values() — resolve immediately.
    catch: (_fn) => Promise.resolve(undefined),
    then: (onResolve, onReject) =>
            Promise.resolve(undefined).then(onResolve, onReject),
  };
  return self;
}

export const db = {
  select: () => makeSelectBuilder(),
  insert: () => makeInsertBuilder(),
};

// Table symbols — passed as arguments but never inspected by the mock.
export const users          = {};
export const jobs           = {};
export const serviceRequests = {};
export const notifications   = {};

export const pool = { end: () => Promise.resolve() };
