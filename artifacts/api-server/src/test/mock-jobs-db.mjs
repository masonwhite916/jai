/**
 * DB mock for jobs-route integration tests.
 *
 * Uses two independent queues:
 *   _selectQueue   — consumed by select …  .limit(1)
 *   _returningQueue — consumed by update … .returning()
 *
 * update chains WITHOUT .returning() are awaitable via the thenable (.then)
 * and resolve to undefined (matching real Drizzle behaviour for no-returning updates).
 */

const _selectQueue    = [];
const _returningQueue = [];
const _updateSetCalls = [];   // legacy: just the set-objects
const _updateCalls    = [];   // { table, set: obj } — tracks which table was updated

export function queueSelect(rows)    { _selectQueue.push(rows); }
export function queueReturning(rows) { _returningQueue.push(rows); }

/** Returns a copy of all objects passed to update().set() since the last resetDb(). */
export function getUpdateSetCalls() { return [..._updateSetCalls]; }

/**
 * Returns a copy of all update calls with table reference and set-object.
 * Shape: Array<{ table: object, set: object }>
 * Use `call.table === serviceRequests` (or `=== jobs`) to find table-specific updates.
 */
export function getUpdateCalls() { return [..._updateCalls]; }

export function resetDb() {
  _selectQueue.length    = 0;
  _returningQueue.length = 0;
  _updateSetCalls.length = 0;
  _updateCalls.length    = 0;
}

// ── Select builder ────────────────────────────────────────────────────────────

function makeSelectBuilder() {
  const self = {
    from:    () => self,
    where:   () => self,
    orderBy: () => self,
    limit:   ()  => Promise.resolve(_selectQueue.shift() ?? []),
    // Support direct await without .limit()
    then:    (onResolve, onReject) =>
               Promise.resolve(_selectQueue.shift() ?? []).then(onResolve, onReject),
  };
  return self;
}

// ── Update builder ────────────────────────────────────────────────────────────

function makeUpdateBuilder(table) {
  const self = {
    set:       (obj) => {
      _updateSetCalls.push(obj);
      _updateCalls.push({ table, set: obj });
      return self;
    },
    where:     () => self,
    returning: ()  => Promise.resolve(_returningQueue.shift() ?? []),
    // Allow await without .returning() — resolves to undefined (no rows).
    then:      (onResolve, onReject) =>
                 Promise.resolve(undefined).then(onResolve, onReject),
  };
  return self;
}

// ── Insert builder ────────────────────────────────────────────────────────────

function makeInsertBuilder() {
  const self = {
    values:    ()  => self,
    returning: ()  => Promise.resolve([]),
    catch:     ()  => Promise.resolve(undefined),
    then:      (onResolve, onReject) =>
                 Promise.resolve(undefined).then(onResolve, onReject),
  };
  return self;
}

// ── db object ─────────────────────────────────────────────────────────────────

export const db = {
  select: () => makeSelectBuilder(),
  update: (table) => makeUpdateBuilder(table),
  insert: () => makeInsertBuilder(),
};

// Table symbols — passed as arguments but never inspected by the mock.
export const users           = {};
export const jobs            = {};
export const serviceRequests = {};
export const notifications   = {};

export const pool = { end: () => Promise.resolve() };
