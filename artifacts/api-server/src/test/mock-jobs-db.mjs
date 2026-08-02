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

export function queueSelect(rows)    { _selectQueue.push(rows); }
export function queueReturning(rows) { _returningQueue.push(rows); }

export function resetDb() {
  _selectQueue.length    = 0;
  _returningQueue.length = 0;
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

function makeUpdateBuilder() {
  const self = {
    set:       () => self,
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
  update: () => makeUpdateBuilder(),
  insert: () => makeInsertBuilder(),
};

// Table symbols — passed as arguments but never inspected by the mock.
export const users           = {};
export const jobs            = {};
export const serviceRequests = {};
export const notifications   = {};

export const pool = { end: () => Promise.resolve() };
