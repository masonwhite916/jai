import {
  pruneOldMessages,
  stampMessages,
  checkStorageSize,
  parseStoredHistory,
  MAX_AGE_MS,
  MAX_SIZE_BYTES,
  type StoredMsg,
} from '../lib/chatHistory';

const NOW = 1_700_000_000_000; // fixed reference time (ms)
const DAY = 24 * 60 * 60 * 1000;

// ── pruneOldMessages ──────────────────────────────────────────────────────────

describe('pruneOldMessages', () => {
  it('keeps messages younger than 30 days', () => {
    const msgs: StoredMsg[] = [
      { id: '1', role: 'user',      content: 'hello', savedAt: NOW - 1 * DAY },
      { id: '2', role: 'assistant', content: 'hi',    savedAt: NOW - 29 * DAY },
    ];
    expect(pruneOldMessages(msgs, NOW)).toHaveLength(2);
  });

  it('removes messages exactly 30 days old or older', () => {
    const msgs: StoredMsg[] = [
      { id: '1', role: 'user',      content: 'old',      savedAt: NOW - 30 * DAY },
      { id: '2', role: 'assistant', content: 'very old', savedAt: NOW - 60 * DAY },
      { id: '3', role: 'user',      content: 'recent',   savedAt: NOW - 1 * DAY  },
    ];
    const result = pruneOldMessages(msgs, NOW);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('keeps legacy messages that have no savedAt (safe default)', () => {
    const msgs: StoredMsg[] = [
      { id: '1', role: 'user', content: 'no timestamp' },
    ];
    expect(pruneOldMessages(msgs, NOW)).toHaveLength(1);
  });

  it('returns an empty array when all messages are expired', () => {
    const msgs: StoredMsg[] = [
      { id: '1', role: 'user',      content: 'a', savedAt: NOW - 31 * DAY },
      { id: '2', role: 'assistant', content: 'b', savedAt: NOW - 45 * DAY },
    ];
    expect(pruneOldMessages(msgs, NOW)).toHaveLength(0);
  });

  it('returns an empty array for empty input', () => {
    expect(pruneOldMessages([], NOW)).toHaveLength(0);
  });

  it('treats a message saved at exactly MAX_AGE_MS - 1 ms as not expired', () => {
    const msgs: StoredMsg[] = [
      { id: '1', role: 'user', content: 'edge', savedAt: NOW - (MAX_AGE_MS - 1) },
    ];
    expect(pruneOldMessages(msgs, NOW)).toHaveLength(1);
  });
});

// ── stampMessages ─────────────────────────────────────────────────────────────

describe('stampMessages', () => {
  it('adds savedAt to messages that lack it', () => {
    const msgs: StoredMsg[] = [{ id: '1', role: 'user', content: 'hi' }];
    const stamped = stampMessages(msgs, NOW);
    expect(stamped[0].savedAt).toBe(NOW);
  });

  it('does not overwrite an existing savedAt', () => {
    const original = NOW - 5 * DAY;
    const msgs: StoredMsg[] = [{ id: '1', role: 'user', content: 'hi', savedAt: original }];
    const stamped = stampMessages(msgs, NOW);
    expect(stamped[0].savedAt).toBe(original);
  });
});

// ── checkStorageSize ──────────────────────────────────────────────────────────

describe('checkStorageSize', () => {
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('does not warn for a small payload', () => {
    checkStorageSize('{"small":"payload"}');
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('warns when payload exceeds 50 KB', () => {
    const big = 'x'.repeat(MAX_SIZE_BYTES + 1);
    checkStorageSize(big);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect((console.warn as jest.Mock).mock.calls[0][0]).toMatch(/exceeds/);
  });

  it('does not warn when payload is exactly MAX_SIZE_BYTES', () => {
    const exact = 'x'.repeat(MAX_SIZE_BYTES);
    checkStorageSize(exact);
    expect(console.warn).not.toHaveBeenCalled();
  });
});

// ── parseStoredHistory ────────────────────────────────────────────────────────

describe('parseStoredHistory', () => {
  it('returns [] when AsyncStorage gives back null (storage cleared by OS)', () => {
    expect(parseStoredHistory(null, NOW)).toEqual([]);
  });

  it('returns [] when AsyncStorage gives back an empty string', () => {
    expect(parseStoredHistory('', NOW)).toEqual([]);
  });

  it('returns [] for malformed JSON (partial write / corruption)', () => {
    expect(parseStoredHistory('{not valid json[[[', NOW)).toEqual([]);
  });

  it('returns [] when every stored entry is expired — fresh greeting + chips should show', () => {
    const allExpired: StoredMsg[] = [
      { id: '1', role: 'user',      content: 'old msg',      savedAt: NOW - 31 * DAY },
      { id: '2', role: 'assistant', content: 'old reply',    savedAt: NOW - 45 * DAY },
    ];
    expect(parseStoredHistory(JSON.stringify(allExpired), NOW)).toEqual([]);
  });

  it('keeps only fresh entries when history is mixed (expired + valid)', () => {
    const mixed: StoredMsg[] = [
      { id: '1', role: 'user',      content: 'expired',  savedAt: NOW - 31 * DAY },
      { id: '2', role: 'assistant', content: 'fresh',    savedAt: NOW - 1 * DAY  },
      { id: '3', role: 'user',      content: 'recent',   savedAt: NOW - 5 * DAY  },
    ];
    const result = parseStoredHistory(JSON.stringify(mixed), NOW);
    expect(result).toHaveLength(2);
    expect(result.map((m) => m.id)).toEqual(['2', '3']);
  });

  it('returns [] when the stored value is valid JSON but not an array', () => {
    expect(parseStoredHistory(JSON.stringify({ role: 'user' }), NOW)).toEqual([]);
  });
});
