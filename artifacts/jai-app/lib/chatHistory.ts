/**
 * Chat history utilities for the AI assistant.
 * Pure functions so they can be unit-tested without React Native.
 */

export const HISTORY_KEY   = 'jai_ai_chat_history';
export const MAX_STORED    = 20;
export const MAX_AGE_MS    = 30 * 24 * 60 * 60 * 1000; // 30 days
export const MAX_SIZE_BYTES = 50 * 1024;                // 50 KB

export interface StoredMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Unix timestamp (ms) when the message was saved — used for 30-day pruning. */
  savedAt?: number;
}

/**
 * Prune messages older than MAX_AGE_MS from a stored history array.
 * @param msgs   Array loaded from AsyncStorage (may lack `savedAt` on old entries).
 * @param now    Current time in ms (injectable for testing).
 * @returns      Filtered array; entries without `savedAt` are kept (they are recent by assumption).
 */
export function pruneOldMessages(msgs: StoredMsg[], now: number = Date.now()): StoredMsg[] {
  return msgs.filter((m) => {
    if (m.savedAt === undefined) return true; // legacy entry — keep it
    return now - m.savedAt < MAX_AGE_MS;
  });
}

/**
 * Stamp each message in the array with the current time if it lacks a savedAt.
 */
export function stampMessages(msgs: StoredMsg[], now: number = Date.now()): StoredMsg[] {
  return msgs.map((m) => (m.savedAt !== undefined ? m : { ...m, savedAt: now }));
}

/**
 * Parse a raw AsyncStorage value into a pruned list of StoredMsg entries.
 *
 * Handles the three failure modes that can occur when the OS evicts storage:
 *  - null / empty  → returns []
 *  - malformed JSON → returns []
 *  - all entries expired → returns []
 *
 * @param raw  The string returned by AsyncStorage.getItem (may be null).
 * @param now  Current time in ms (injectable for testing).
 * @returns    Pruned array; an empty array is the safe default for every failure.
 */
export function parseStoredHistory(raw: string | null, now: number = Date.now()): StoredMsg[] {
  if (!raw) return [];
  try {
    const parsed: StoredMsg[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return pruneOldMessages(parsed, now);
  } catch {
    return [];
  }
}

/**
 * Warn (non-fatal) if a serialised payload is larger than MAX_SIZE_BYTES.
 * @returns true if the payload exceeds the soft limit, false otherwise.
 */
export function checkStorageSize(serialised: string): boolean {
  // Use byte length where possible; fall back to char count.
  const bytes =
    typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(serialised).length
      : serialised.length;
  if (bytes > MAX_SIZE_BYTES) {
    console.warn(
      `[AI chat] Stored history is ${bytes} bytes — exceeds the ${MAX_SIZE_BYTES}-byte soft limit. ` +
        'Consider clearing the chat to free space on this device.',
    );
    return true;
  }
  return false;
}
