/**
 * Extended mock for @workspace/db for payment-gate tests.
 * Supports select (queue-based), insert (no-op returning dummy row),
 * and the schema exports needed by requests.ts.
 */

const _selectQueue = [];

/** Queue the next rows that a .select()…chain will resolve with. */
export function queueSelect(rows) {
  _selectQueue.push(rows);
}

/** Reset all queues. */
export function resetDb() {
  _selectQueue.length = 0;
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
      self._insertValues = v;
      return self;
    },
    onConflictDoUpdate: () => self,
  };
  return self;
};

export const db = {
  select:   () => makeBuilder(),
  insert:   (table) => makeBuilder({ insertRows: [{ id: 99, status: "pending" }] }),
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
