/**
 * Extended mock for @workspace/db for payment-gate tests.
 * Supports select (queue-based), insert (no-op returning dummy row),
 * and the schema exports needed by requests.ts.
 */

const _selectQueue = [];
const _insertHistory = [];  // grows as db.insert().values() calls happen in order

/** Queue the next rows that a .select()…chain will resolve with. */
export function queueSelect(rows) {
  _selectQueue.push(rows);
}

/**
 * Return values from the Nth db.insert().values() call in the current test
 * (0-indexed). The first insert is serviceRequests (index 0), the second is
 * jobs (index 1).
 */
export function getInsertValues(callIndex = 0) {
  return _insertHistory[callIndex] ?? null;
}

/** Reset all queues and captured state. */
export function resetDb() {
  _selectQueue.length = 0;
  _insertHistory.length = 0;
}

// Minimal drizzle-style builder: all chain methods return self, resolves via queue.
const makeBuilder = (opts = {}) => {
  const self = {
    from:      () => self,
    where:     () => self,
    limit:     () => Promise.resolve(_selectQueue.shift() ?? []),
    orderBy:   () => self,
    returning: () => Promise.resolve(opts.insertRows ?? []),
    set:       () => self,
    values:    (v) => {
      _insertHistory.push(v);  // append in call order — don't overwrite
      return self;
    },
    onConflictDoUpdate: () => self,
  };
  return self;
};

export const db = {
  select:   () => makeBuilder(),
  insert:   () => makeBuilder({ insertRows: [{ id: 99, status: "pending" }] }),
  update:   () => makeBuilder(),
  delete:   () => makeBuilder(),
};

// Table references — not inspected by the mock.
export const users                = {};
export const jobs                 = { id: {} };
export const serviceRequests      = {};
export const servicePaymentRefs   = {};
export const applePaySessions     = {};
export const userSessions         = {};
export const notifications        = {};
export const adminSessions        = {};
export const vehicles             = {};
export const chatMessages         = {};
export const jobRatings           = {};
export const siteSettings         = {};
export const technicianLocations  = {};

export const pool = { end: () => Promise.resolve() };
