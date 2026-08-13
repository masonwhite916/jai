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

/**
 * Each entry: [skipsRemaining, error]
 * When skipsRemaining reaches 0 on the next update().set() call the error is thrown.
 * Use queueUpdateError(err, skip) to let `skip` updates succeed first.
 */
const _updateErrorQueue = [];

export function queueSelect(rows)    { _selectQueue.push(rows); }
export function queueReturning(rows) { _returningQueue.push(rows); }

/**
 * Queue an error to be thrown by a future update().set() call.
 * @param {Error} err   — the error to throw
 * @param {number} skip — how many update().set() calls to let through before throwing (default 0)
 */
export function queueUpdateError(err, skip = 0) {
  _updateErrorQueue.push([skip, err]);
}

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
  _updateErrorQueue.length = 0;
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

// ── Error builder (returned by update().set() when an error is queued) ────────

function makeErrorBuilder(err) {
  const reject = () => Promise.reject(err);
  const self = {
    where:     () => self,
    returning: reject,
    then:      (onResolve, onReject) => reject().then(onResolve, onReject),
  };
  return self;
}

// ── Update builder ────────────────────────────────────────────────────────────

function makeUpdateBuilder(table) {
  const self = {
    set: (obj) => {
      _updateSetCalls.push(obj);
      _updateCalls.push({ table, set: obj });

      // Check whether a queued error should fire on this set() call.
      if (_updateErrorQueue.length > 0) {
        const [skip, err] = _updateErrorQueue[0];
        if (skip === 0) {
          _updateErrorQueue.shift();
          return makeErrorBuilder(err);
        } else {
          _updateErrorQueue[0] = [skip - 1, err];
        }
      }

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
  /**
   * Minimal transaction shim: calls `fn` with the same db mock.
   * Real Postgres rolls back on throw — tests verify that the route propagates
   * the error (500) and does not proceed to side-effects.
   */
  transaction: (fn) => fn(db),
};

// Table symbols — passed as arguments but never inspected by the mock.
export const users           = {};
export const jobs            = {};
export const serviceRequests = {};
export const notifications   = {};

export const pool = { end: () => Promise.resolve() };
