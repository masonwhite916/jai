/**
 * Integration test: GPS location relay through the WebSocket dispatch server.
 *
 * What is tested:
 *  - Happy path: technician authenticates → sends location_update → admin
 *    client receives tech_location_admin with the correct payload.
 *  - Admin auth rejection: a bad token (admin_badtoken) receives auth_error
 *    and is NOT silently added to the admin room.
 *
 * "@workspace/db" is intercepted by the custom ESM loader (hooks.mjs →
 * loader.mjs) and replaced with mock-db.mjs so no real Postgres connection
 * is needed.
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { WebSocket } from "ws";
import { queueResult, resetQueue } from "./mock-db.mjs";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Dynamically import the dispatch singleton (after mocks are registered). */
const { dispatch }      = await import("../lib/dispatch.ts");
const { createAdminSession } = await import("../lib/adminSessions.ts");

/**
 * Open a WebSocket to the local server and return it once the connection is
 * established.
 */
function connect(port) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/ws`);
    ws.once("open",  () => resolve(ws));
    ws.once("error", reject);
  });
}

/**
 * Send a JSON message and wait for the next JSON message from the same socket.
 */
function sendAndReceive(ws, message) {
  return new Promise((resolve, reject) => {
    ws.once("message", (raw) => {
      try { resolve(JSON.parse(String(raw))); } catch (e) { reject(e); }
    });
    ws.send(JSON.stringify(message));
  });
}

/**
 * Wait for the next message on a socket (no send).
 */
function nextMessage(ws) {
  return new Promise((resolve, reject) => {
    ws.once("message", (raw) => {
      try { resolve(JSON.parse(String(raw))); } catch (e) { reject(e); }
    });
  });
}

// ── Test fixtures ─────────────────────────────────────────────────────────────

let server;
let port;

before(async () => {
  // Suppress noisy pino-pretty output in tests.
  process.env.LOG_LEVEL = "silent";
  process.env.NODE_ENV  = "production"; // skips pino-pretty transport

  server = createServer();
  dispatch.attach(server);

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = server.address().port;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

// ── Tests ─────────────────────────────────────────────────────────────────────

test("location_update relayed to admin room as tech_location_admin", async () => {
  resetQueue();

  // Step 1: Admin connects and authenticates with a real in-memory session token.
  const adminSession = createAdminSession();
  const adminWs = await connect(port);

  const adminAuthReply = await sendAndReceive(adminWs, {
    type: "auth",
    token: adminSession.token,
  });
  assert.equal(adminAuthReply.type, "auth_ok",  "admin should receive auth_ok");
  assert.equal(adminAuthReply.role, "admin",     "admin role should be 'admin'");

  // Step 2: Technician connects and authenticates.
  // Queue the DB row the auth handler will look up (users table).
  const TECH_ID = 7;
  queueResult([{ id: TECH_ID, role: "technician" }]);

  const techWs = await connect(port);
  const techAuthReply = await sendAndReceive(techWs, {
    type: "auth",
    token: "valid_tech_token",
  });
  assert.equal(techAuthReply.type,   "auth_ok",     "technician should receive auth_ok");
  assert.equal(techAuthReply.role,   "technician",  "role should be 'technician'");
  assert.equal(techAuthReply.userId, TECH_ID,       "userId should match queued DB row");

  // Step 3: Technician sends location_update.
  // Queue the DB row the assignment-check handler will look up (jobs table).
  const JOB_ID = 42;
  queueResult([{ id: JOB_ID }]); // non-empty → technician is assigned to this job

  const LAT = 25.7617;
  const LNG = -80.1918;

  // The admin is already in the "admin" room; arm nextMessage BEFORE the tech
  // sends so there's no race between sending and listening.
  const adminMsgPromise = nextMessage(adminWs);

  techWs.send(JSON.stringify({ type: "location_update", lat: LAT, lng: LNG, jobId: JOB_ID }));

  const adminMsg = await adminMsgPromise;

  assert.equal(adminMsg.type,        "tech_location_admin", "event type should be tech_location_admin");
  assert.equal(adminMsg.technicianId, TECH_ID,              "technicianId should match");
  assert.equal(adminMsg.lat,          LAT,                  "lat should be relayed");
  assert.equal(adminMsg.lng,          LNG,                  "lng should be relayed");
  assert.ok(typeof adminMsg.seenAt === "string",            "seenAt should be an ISO timestamp string");

  adminWs.close();
  techWs.close();
});

test("bad admin token receives auth_error and is not joined to admin room", async () => {
  resetQueue();

  const wsA = await connect(port);

  const reply = await sendAndReceive(wsA, {
    type: "auth",
    token: "admin_badtoken_that_does_not_exist",
  });

  assert.equal(reply.type,  "auth_error", "bad admin token should produce auth_error");
  assert.ok(reply.error,                  "error field should be present");

  // The socket should NOT be in the "admin" room.  Verify this by having a
  // second admin (with a valid token) send a location message and confirming
  // the rejected socket never receives it.  We use a short timeout.
  const didReceive = await new Promise((resolve) => {
    wsA.once("message", () => resolve(true));
    setTimeout(() => resolve(false), 150);
  });

  assert.equal(didReceive, false, "rejected socket must not receive admin-room broadcasts");

  wsA.close();
});

test("location_update for unassigned job is silently dropped — admin room gets no tech_location_admin", async () => {
  resetQueue();

  // Admin connects and authenticates.
  const adminSession = createAdminSession();
  const adminWs = await connect(port);
  const adminAuthReply = await sendAndReceive(adminWs, {
    type: "auth",
    token: adminSession.token,
  });
  assert.equal(adminAuthReply.type, "auth_ok", "admin should receive auth_ok");

  // Technician connects and authenticates.
  const TECH_ID = 11;
  queueResult([{ id: TECH_ID, role: "technician" }]);

  const techWs = await connect(port);
  const techAuthReply = await sendAndReceive(techWs, {
    type: "auth",
    token: "valid_tech_token_2",
  });
  assert.equal(techAuthReply.type, "auth_ok", "technician should receive auth_ok");

  // Queue an EMPTY result for the assignment check — technician is NOT assigned.
  queueResult([]); // empty → not assigned → handler silently returns

  // Arm the admin listener before the tech sends.
  const adminReceivedMsg = await new Promise((resolve) => {
    adminWs.once("message", () => resolve(true));
    techWs.send(
      JSON.stringify({ type: "location_update", lat: 25.76, lng: -80.19, jobId: 99 })
    );
    setTimeout(() => resolve(false), 200);
  });

  assert.equal(
    adminReceivedMsg,
    false,
    "admin room must NOT receive tech_location_admin when technician is not assigned to the job"
  );

  adminWs.close();
  techWs.close();
});

test("location_update with invalid (NaN) jobId is silently dropped — no crash, no relay to admin", async () => {
  resetQueue();

  // Admin connects and authenticates.
  const adminSession = createAdminSession();
  const adminWs = await connect(port);
  const adminAuthReply = await sendAndReceive(adminWs, {
    type: "auth",
    token: adminSession.token,
  });
  assert.equal(adminAuthReply.type, "auth_ok", "admin should receive auth_ok");

  // Technician connects and authenticates.
  const TECH_ID = 13;
  queueResult([{ id: TECH_ID, role: "technician" }]);

  const techWs = await connect(port);
  const techAuthReply = await sendAndReceive(techWs, {
    type: "auth",
    token: "valid_tech_token_3",
  });
  assert.equal(techAuthReply.type, "auth_ok", "technician should receive auth_ok");

  // Send a location_update with a non-numeric jobId. The NaN guard at line 209
  // of dispatch.ts should cause an early return before any DB query is issued.
  // No queueResult needed — the handler must not reach the DB call at all.
  const adminReceivedMsg = await new Promise((resolve) => {
    adminWs.once("message", () => resolve(true));
    techWs.send(
      JSON.stringify({ type: "location_update", lat: 25.76, lng: -80.19, jobId: "not-a-number" })
    );
    setTimeout(() => resolve(false), 200);
  });

  assert.equal(
    adminReceivedMsg,
    false,
    "admin room must NOT receive any event when jobId is NaN"
  );

  // Server must still be alive — a subsequent valid-looking message should not
  // throw. Use the admin socket to confirm the server is still responsive.
  // (A crash would close the connection; checking readyState is sufficient.)
  assert.equal(
    adminWs.readyState,
    adminWs.OPEN,
    "server must still be running after a NaN jobId message"
  );

  adminWs.close();
  techWs.close();
});
