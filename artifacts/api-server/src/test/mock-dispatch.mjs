/**
 * Spy dispatch stub for route integration tests.
 * broadcastToRoom records every call so tests can assert broadcast payloads.
 */

const _broadcastCalls = [];

export const dispatch = {
  broadcastToRoom: (room, payload) => { _broadcastCalls.push({ room, payload }); },
  attach:          () => {},
};

/** Returns a copy of all broadcastToRoom calls since the last reset. */
export function getBroadcastCalls() { return [..._broadcastCalls]; }

/** Clears the recorded calls. */
export function resetBroadcastCalls() { _broadcastCalls.length = 0; }
