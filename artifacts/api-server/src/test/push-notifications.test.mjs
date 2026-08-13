/**
 * Integration tests for push notification helpers in pushNotifications.ts.
 *
 * What is tested:
 *  1. notifyTechniciansNewJob — fetches only technicians with a valid token
 *     (length > 10) and calls the Expo push endpoint with the correct payload.
 *  2. notifyTechniciansNewJob — skips the Expo call entirely when no valid
 *     token exists (all null or too short).
 *  3. notifyCustomerJobAccepted — resolves the correct customer and sends
 *     the expected title, body, and data payload.
 *  4. notifyCustomerJobAccepted — returns early without a push call when
 *     the customer has no push token.
 *  5. notifyCustomerJobCompleted — sends the expected title, body, and data
 *     payload for a completed service.
 *
 * "@workspace/db" is intercepted by push-hooks.mjs → push-loader.mjs and
 * replaced with mock-push-db.mjs so no real Postgres connection is needed.
 * The global `fetch` is replaced with an in-process spy to capture Expo
 * push API calls without making real network requests.
 */

import { test, before } from "node:test";
import assert from "node:assert/strict";
import {
  queueSelect,
  resetDb,
  getInsertedRows,
  getNulledTokens,
} from "./mock-push-db.mjs";

// ── Global fetch spy ──────────────────────────────────────────────────────────

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

let capturedFetchCalls = [];

function resetFetch() {
  capturedFetchCalls = [];
}

// Replace global fetch before the module under test is imported.
globalThis.fetch = async (url, options) => {
  capturedFetchCalls.push({
    url,
    body: options?.body ? JSON.parse(options.body) : undefined,
    headers: options?.headers ?? {},
  });
  return {
    ok:   true,
    status: 200,
    text: async () => "OK",
    json: async () => ({}),
  };
};

// ── Import module under test (dynamic — after mocks are wired) ────────────────

process.env.LOG_LEVEL = "silent";
process.env.NODE_ENV  = "production";

const {
  sendPush,
  notifyTechniciansNewJob,
  notifyCustomerJobAccepted,
  notifyCustomerJobCompleted,
} = await import("../lib/pushNotifications.ts");

// ── Helpers ───────────────────────────────────────────────────────────────────

function setup() {
  resetDb();
  resetFetch();
}

function expoCallBodies() {
  return capturedFetchCalls
    .filter((c) => c.url === EXPO_PUSH_URL)
    .map((c) => c.body);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test("1. notifyTechniciansNewJob — fetches techs with valid tokens and calls Expo push", async () => {
  setup();

  const VALID_TOKEN_A = "ExponentPushToken[aaaaaaaaaa1]";
  const VALID_TOKEN_B = "ExponentPushToken[bbbbbbbbbb2]";
  const NULL_TOKEN    = null;
  const SHORT_TOKEN   = "short"; // length ≤ 10 — must be filtered out

  // First DB query: select all technicians (push_token column)
  queueSelect([
    { push_token: VALID_TOKEN_A },
    { push_token: VALID_TOKEN_B },
    { push_token: NULL_TOKEN    },
    { push_token: SHORT_TOKEN   },
  ]);
  // Second DB query: re-fetch technician IDs for notification insert
  queueSelect([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);

  await notifyTechniciansNewJob({
    serviceType: "battery",
    address:     "123 Main St",
    payout:      120,
    jobId:       7,
  });

  const bodies = expoCallBodies();
  assert.equal(bodies.length, 1, "Expo push API should be called exactly once");

  // sendPush now flattens multi-token messages to one entry per token so that
  // individual DeviceNotRegistered tickets can be mapped back to a specific token.
  const payload = bodies[0];
  assert.ok(Array.isArray(payload), "Payload sent to Expo should be an array");
  assert.equal(payload.length, 2, "Flattened payload should have one entry per valid token");

  // Each entry must be addressed to exactly one token (string, not array)
  const tokens = payload.map((m) => m.to);
  assert.ok(tokens.includes(VALID_TOKEN_A), "Valid token A must be included");
  assert.ok(tokens.includes(VALID_TOKEN_B), "Valid token B must be included");
  assert.equal(tokens.includes(SHORT_TOKEN), false, "Short token must be excluded");
  assert.equal(tokens.includes(NULL_TOKEN),  false, "Null token must be excluded");

  // Payload shape (check first message — both should be identical apart from 'to')
  const msg = payload[0];
  assert.ok(msg.title.includes("Battery"), "Title should include capitalised service type");
  assert.ok(msg.title.includes("123 Main St"), "Title should include the address");
  assert.ok(msg.body.includes("120"), "Body should mention the payout amount");
  assert.equal(msg.data?.type,  "new_job", "data.type should be 'new_job'");
  assert.equal(msg.data?.jobId, 7,         "data.jobId should match opts.jobId");
  assert.equal(msg.sound, "default", "sound should be 'default'");
  assert.equal(msg.channelId, "jobs", "channelId should be 'jobs'");
});

test("2. notifyTechniciansNewJob — no Expo call when all technician tokens are null/short", async () => {
  setup();

  queueSelect([
    { push_token: null    },
    { push_token: "tiny"  },
    { push_token: ""      },
  ]);

  await notifyTechniciansNewJob({
    serviceType: "fuel",
    address:     null,
    payout:      80,
    jobId:       8,
  });

  const bodies = expoCallBodies();
  assert.equal(bodies.length, 0, "Expo push API must NOT be called when no valid tokens exist");
});

test("3. notifyCustomerJobAccepted — resolves customer and sends correct title/body/data", async () => {
  setup();

  const CUSTOMER_TOKEN = "ExponentPushToken[customer_abc123]";
  const CUSTOMER_ID    = 42;

  // First select: push_token for customer
  queueSelect([{ push_token: CUSTOMER_TOKEN }]);
  // Second select: customer id (for notification insert)
  queueSelect([{ id: CUSTOMER_ID }]);

  await notifyCustomerJobAccepted({
    customerId:  CUSTOMER_ID,
    techName:    "Ali Hassan",
    serviceType: "tire",
    jobId:       55,
    requestId:   99,
  });

  const bodies = expoCallBodies();
  assert.equal(bodies.length, 1, "Expo push API should be called exactly once");

  const [msg] = bodies[0];
  assert.equal(msg.to, CUSTOMER_TOKEN, "'to' should be the customer's push token");
  assert.ok(msg.title.includes("Technician"),  "Title should mention technician");
  assert.ok(msg.body.includes("Ali Hassan"),   "Body should include the technician's name");
  assert.ok(msg.body.includes("Tire"),         "Body should include capitalised service type");
  assert.equal(msg.data?.type,      "job_accepted", "data.type should be 'job_accepted'");
  assert.equal(msg.data?.jobId,     55,             "data.jobId should match opts.jobId");
  assert.equal(msg.data?.requestId, 99,             "data.requestId should match opts.requestId");
  assert.equal(msg.data?.screen,    "tracking",     "data.screen should be 'tracking'");
  assert.equal(msg.sound,           "default",      "sound should be 'default'");
});

test("4. notifyCustomerJobAccepted — no Expo call when customer has no push token", async () => {
  setup();

  // Customer exists but has no token
  queueSelect([{ push_token: null }]);

  await notifyCustomerJobAccepted({
    customerId:  10,
    techName:    "Omar",
    serviceType: "fuel",
    jobId:       11,
    requestId:   22,
  });

  assert.equal(expoCallBodies().length, 0, "Expo push API must NOT be called when customer has no token");
});

test("5. notifyCustomerJobCompleted — sends correct title/body/data for a completed service", async () => {
  setup();

  const CUSTOMER_TOKEN = "ExponentPushToken[customer_done99]";

  // First select: push_token for customer
  queueSelect([{ push_token: CUSTOMER_TOKEN }]);
  // Second select: customer id (for notification insert)
  queueSelect([{ id: 77 }]);

  await notifyCustomerJobCompleted({
    customerId:  77,
    serviceType: "mechanic",
    payout:      300,
    requestId:   200,
  });

  const bodies = expoCallBodies();
  assert.equal(bodies.length, 1, "Expo push API should be called exactly once");

  const [msg] = bodies[0];
  assert.equal(msg.to, CUSTOMER_TOKEN, "'to' should be the customer's push token");
  assert.ok(msg.title.includes("completed") || msg.title.includes("🎉"), "Title should signal completion");
  assert.ok(msg.body.includes("Mechanic"),  "Body should include capitalised service type");
  assert.ok(msg.body.includes("300"),       "Body should mention the payout amount");
  assert.equal(msg.data?.type,      "job_completed", "data.type should be 'job_completed'");
  assert.equal(msg.data?.requestId, 200,              "data.requestId should match opts.requestId");
  assert.equal(msg.data?.screen,    "requests",       "data.screen should be 'requests'");
});

test("6. sendPush — nulls DeviceNotRegistered tokens returned in the Expo send ticket response", async () => {
  setup();

  const STALE_TOKEN = "ExponentPushToken[stale_device_xyz123]";
  const GOOD_TOKEN  = "ExponentPushToken[healthy_device_abc]";

  // Override fetch to return mixed tickets: first token ok, second DeviceNotRegistered
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    capturedFetchCalls.push({
      url,
      body:    options?.body ? JSON.parse(options.body) : undefined,
      headers: options?.headers ?? {},
    });
    return {
      ok:     true,
      status: 200,
      text:   async () => "",
      json:   async () => ({
        data: [
          { status: "ok",    id: "receipt-111" },
          { status: "error", message: "The device cannot receive push notifications",
            details: { error: "DeviceNotRegistered" } },
        ],
      }),
    };
  };

  try {
    // Two tokens in one call — only the second is stale
    await sendPush({
      to:    [GOOD_TOKEN, STALE_TOKEN],
      title: "Test",
      body:  "Test body",
    });

    // The stale token must have been nulled in the DB
    const nulled = getNulledTokens();
    assert.equal(nulled.length, 1, "Exactly one token should be nulled");
    assert.equal(nulled[0], STALE_TOKEN, "The DeviceNotRegistered token must be the one nulled");

    // The Expo push endpoint must have been called once, with two flattened messages
    const bodies = expoCallBodies();
    assert.equal(bodies.length, 1, "Expo push API should be called once");
    assert.equal(bodies[0].length, 2, "Flattened payload should contain one entry per token");
    assert.equal(bodies[0][0].to, GOOD_TOKEN,  "First entry should be the good token");
    assert.equal(bodies[0][1].to, STALE_TOKEN, "Second entry should be the stale token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
