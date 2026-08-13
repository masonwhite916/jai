/**
 * DB mock for promo-enforcement tests (validate-promo + service-checkout).
 *
 * Covers both @workspace/db (db + pool) and @workspace/db/schema (table refs).
 *
 * Usage:
 *   queueSelect(rows)         — next select().from().where().limit() resolves with rows
 *   queueInsertReturning(rows) — next insert().values().onConflictDoNothing().returning() resolves with rows
 *   getDeleteCallCount()       — how many times db.delete().where() was called
 *   resetDb()                  — clear all queues and counters
 */

const _selectQueue = [];
const _insertQueue = [];
let _deleteCallCount = 0;

export function queueSelect(rows)          { _selectQueue.push(rows); }
export function queueInsertReturning(rows) { _insertQueue.push(rows); }
export function getDeleteCallCount()       { return _deleteCallCount; }

export function resetDb() {
  _selectQueue.length = 0;
  _insertQueue.length = 0;
  _deleteCallCount = 0;
}

// ── Builder factories ─────────────────────────────────────────────────────────

const makeSelectBuilder = () => {
  const self = {
    from:    () => self,
    where:   () => self,
    limit:   () => Promise.resolve(_selectQueue.shift() ?? []),
    orderBy: () => self,
  };
  return self;
};

const makeInsertBuilder = () => {
  const self = {
    values:              (v) => self,
    onConflictDoNothing: ()  => self,
    onConflictDoUpdate:  ()  => self,
    returning:           ()  => Promise.resolve(_insertQueue.shift() ?? [{ id: 1 }]),
  };
  return self;
};

const makeDeleteBuilder = () => {
  const self = {
    // Increment counter and resolve — callers don't await a value from delete
    where: () => { _deleteCallCount++; return Promise.resolve(); },
  };
  return self;
};

const makeUpdateBuilder = () => {
  const self = {
    set:   () => self,
    where: () => Promise.resolve(),
  };
  return self;
};

// ── Exported db object ────────────────────────────────────────────────────────

export const db = {
  select: () => makeSelectBuilder(),
  insert: () => makeInsertBuilder(),
  delete: () => makeDeleteBuilder(),
  update: () => makeUpdateBuilder(),
};

// ── Schema table references (only the columns the routes reference) ────────────

export const promoUses          = { id: {}, user_id: {}, code: {} };
export const users              = {};
export const vehicles           = {};
export const servicePaymentRefs = {};
export const applePaySessions   = {};
export const userSessions       = {};
export const notifications      = {};
export const adminSessions      = {};
export const chatMessages       = {};
export const jobRatings         = {};
export const siteSettings       = {};
export const technicianLocations = {};
export const serviceRequests    = {};
export const jobs               = {};

export const pool = { end: () => Promise.resolve() };
