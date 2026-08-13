/**
 * Integration test: PATCH /api/jobs/:id status → "completed" fires
 * notifyCustomerJobCompleted with the correct arguments.
 *
 * What is tested:
 *  - A technician advancing their job to "completed" triggers
 *    notifyCustomerJobCompleted with the customerId from the service request,
 *    the correct serviceType, payout, and requestId.
 *  - The HTTP response is still 200 even though the push call is fire-and-forget.
 *
 * Mocked modules (via jobs-loader.mjs):
 *   @workspace/db        → mock-jobs-db.mjs
 *   requireAuth          → mock-require-auth-tech.mjs  (sets userRole=technician)
 *   lib/dispatch         → mock-dispatch.mjs           (no-op broadcastToRoom)
 *   lib/pushNotifications → mock-push-notif.mjs        (spy on all helpers)
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";

import { queueSelect, queueReturning, resetDb, getUpdateSetCalls, getUpdateCalls, serviceRequests } from "./mock-jobs-db.mjs";
import { getNotifCalls, resetNotifCalls }                          from "./mock-push-notif.mjs";
import { getBroadcastCalls, resetBroadcastCalls }                  from "./mock-dispatch.mjs";

// ── Import router under test (dynamic — after hooks have wired the mocks) ──────

process.env.LOG_LEVEL = "silent";
process.env.NODE_ENV  = "production";

const { default: jobsRouter } = await import("../routes/jobs.ts");
const express = (await import("express")).default;

// ── Server setup ───────────────────────────────────────────────────────────────

let server;
let port;

before(async () => {
  const app = express();
  app.use(express.json());

  // The real requireAuth is replaced by the mock via the ESM loader; the
  // mock reads x-test-user-id so we inject req.userId without a real JWT.
  app.use(jobsRouter);

  server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = server.address().port;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

// ── Helpers ────────────────────────────────────────────────────────────────────

async function patchJob(jobId, body, userId = 1) {
  const url  = `http://127.0.0.1:${port}/jobs/${jobId}`;
  const resp = await fetch(url, {
    method:  "PATCH",
    headers: {
      "Content-Type":     "application/json",
      "x-test-user-id":   String(userId),
    },
    body: JSON.stringify(body),
  });
  const json = await resp.json().catch(() => ({}));
  return { status: resp.status, body: json };
}

function setup() {
  resetDb();
  resetNotifCalls();
  resetBroadcastCalls();
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test("PATCH /jobs/:id status=completed fires notifyCustomerJobCompleted with correct args", async () => {
  setup();

  const JOB_ID      = 42;
  const REQUEST_ID  = 10;
  const CUSTOMER_ID = 5;
  const TECH_ID     = 1;
  const PAYOUT      = 120;

  // DB: fetch existing job (must be 'working', owned by TECH_ID)
  queueSelect([{
    id:           JOB_ID,
    status:       "working",
    technician_id: TECH_ID,
    request_id:   REQUEST_ID,
    payout:       PAYOUT,
  }]);

  // DB: update serviceRequests returning → completedReq (provides customer_id + service_type)
  queueReturning([{
    id:           REQUEST_ID,
    customer_id:  CUSTOMER_ID,
    service_type: "battery",
    status:       "completed",
  }]);

  // DB: update jobs returning → final updated job row
  queueReturning([{
    id:           JOB_ID,
    status:       "completed",
    technician_id: TECH_ID,
    request_id:   REQUEST_ID,
    payout:       PAYOUT,
    completed_at: new Date().toISOString(),
  }]);

  const { status } = await patchJob(JOB_ID, { status: "completed" }, TECH_ID);
  assert.equal(status, 200, "Route should respond 200 for a valid working→completed transition");

  // notifyCustomerJobCompleted is called with `void` (fire-and-forget).
  // Give the microtask queue a tick to flush the async call.
  await new Promise((r) => setTimeout(r, 20));

  const calls = getNotifCalls();

  assert.equal(
    calls.notifyCustomerJobCompleted.length,
    1,
    "notifyCustomerJobCompleted should be called exactly once",
  );

  const args = calls.notifyCustomerJobCompleted[0];
  assert.equal(args.customerId,  CUSTOMER_ID, "customerId should come from the service request row");
  assert.equal(args.serviceType, "battery",   "serviceType should come from the service request row");
  assert.equal(args.payout,      PAYOUT,      "payout should come from the job row");
  assert.equal(args.requestId,   REQUEST_ID,  "requestId should match the job's request_id");
});

test("PATCH /jobs/:id status=completed does NOT fire notifyCustomerJobCompleted when DB returns no service request", async () => {
  setup();

  const JOB_ID  = 43;
  const TECH_ID = 1;

  // Existing job
  queueSelect([{
    id:            JOB_ID,
    status:        "working",
    technician_id: TECH_ID,
    request_id:    11,
    payout:        80,
  }]);

  // serviceRequests update returns nothing (e.g. row was already deleted)
  queueReturning([]);

  // Jobs update returning → still needed for the final response
  queueReturning([{
    id:     JOB_ID,
    status: "completed",
  }]);

  const { status } = await patchJob(JOB_ID, { status: "completed" }, TECH_ID);
  assert.equal(status, 200, "Route should still respond 200");

  await new Promise((r) => setTimeout(r, 20));

  const calls = getNotifCalls();
  assert.equal(
    calls.notifyCustomerJobCompleted.length,
    0,
    "notifyCustomerJobCompleted must NOT be called when completedReq is undefined",
  );
});

test("PATCH /jobs/:id rejects an invalid transition (working → pending) with 422", async () => {
  setup();

  queueSelect([{
    id:            50,
    status:        "working",
    technician_id: 1,
    request_id:    20,
    payout:        200,
  }]);

  const { status, body } = await patchJob(50, { status: "pending" }, 1);
  assert.equal(status, 422, "Invalid transition should return 422");
  assert.ok(body.error, "Error message should be present");

  await new Promise((r) => setTimeout(r, 10));

  const calls = getNotifCalls();
  assert.equal(
    calls.notifyCustomerJobCompleted.length,
    0,
    "notifyCustomerJobCompleted must NOT be called for a rejected transition",
  );
});

// ── Accepted-transition tests ──────────────────────────────────────────────────

test("PATCH /jobs/:id status=accepted fires notifyCustomerJobAccepted with correct args", async () => {
  setup();

  const JOB_ID      = 60;
  const REQUEST_ID  = 20;
  const CUSTOMER_ID = 7;
  const TECH_ID     = 2;
  const TECH_NAME   = "Ali Hassan";
  const SERVICE     = "tire";

  // 1. Fetch existing job — must be pending and unassigned
  queueSelect([{
    id:            JOB_ID,
    status:        "pending",
    technician_id: null,
    request_id:    REQUEST_ID,
    payout:        150,
  }]);

  // 2. Atomic update returning → the newly-accepted job row
  queueReturning([{
    id:            JOB_ID,
    status:        "accepted",
    technician_id: TECH_ID,
    request_id:    REQUEST_ID,
    payout:        150,
  }]);

  // 3. Fetch technician info (name, phone, rating)
  queueSelect([{
    name:   TECH_NAME,
    phone:  "+966500000001",
    rating: 4.8,
  }]);

  // 4. Fetch service request for notification (customer_id + service_type)
  queueSelect([{
    customer_id:  CUSTOMER_ID,
    service_type: SERVICE,
  }]);

  const { status, body } = await patchJob(JOB_ID, { status: "accepted" }, TECH_ID);
  assert.equal(status, 200, "Route should respond 200 for a valid pending→accepted transition");
  assert.equal(body.status, "accepted", "Response body should contain the updated job row");

  // notifyCustomerJobAccepted is called with `void` (fire-and-forget); flush microtasks.
  await new Promise((r) => setTimeout(r, 20));

  const calls = getNotifCalls();

  assert.equal(
    calls.notifyCustomerJobAccepted.length,
    1,
    "notifyCustomerJobAccepted should be called exactly once",
  );

  const args = calls.notifyCustomerJobAccepted[0];
  assert.equal(args.customerId,  CUSTOMER_ID, "customerId should come from the service request row");
  assert.equal(args.techName,    TECH_NAME,   "techName should come from the technician user row");
  assert.equal(args.serviceType, SERVICE,     "serviceType should come from the service request row");
  assert.equal(args.jobId,       JOB_ID,      "jobId should match the patched job");
  assert.equal(args.requestId,   REQUEST_ID,  "requestId should match the job's request_id");
});

test("PATCH /jobs/:id status=accepted does NOT fire notifyCustomerJobAccepted when service request is missing", async () => {
  setup();

  const JOB_ID  = 61;
  const TECH_ID = 2;

  // 1. Existing job — pending, unassigned
  queueSelect([{
    id:            JOB_ID,
    status:        "pending",
    technician_id: null,
    request_id:    21,
    payout:        90,
  }]);

  // 2. Atomic update returning → accepted row
  queueReturning([{
    id:            JOB_ID,
    status:        "accepted",
    technician_id: TECH_ID,
    request_id:    21,
    payout:        90,
  }]);

  // 3. Technician info
  queueSelect([{ name: "Omar", phone: "+966500000002", rating: 4.5 }]);

  // 4. Service request not found
  queueSelect([]);

  const { status } = await patchJob(JOB_ID, { status: "accepted" }, TECH_ID);
  assert.equal(status, 200, "Route should still respond 200 when service request is missing");

  await new Promise((r) => setTimeout(r, 20));

  const calls = getNotifCalls();
  assert.equal(
    calls.notifyCustomerJobAccepted.length,
    0,
    "notifyCustomerJobAccepted must NOT be called when sreq is undefined",
  );
});

test("PATCH /jobs/:id status=accepted responds 409 when job is already taken", async () => {
  setup();

  const JOB_ID  = 62;
  const TECH_ID = 2;

  // 1. Existing job is pending (passes the ownership guard for accept)
  queueSelect([{
    id:            JOB_ID,
    status:        "pending",
    technician_id: null,
    request_id:    22,
    payout:        100,
  }]);

  // 2. Atomic update returns empty (another technician beat us to it)
  queueReturning([]);

  const { status, body } = await patchJob(JOB_ID, { status: "accepted" }, TECH_ID);
  assert.equal(status, 409, "Race-condition acceptance should return 409");
  assert.ok(body.error, "Error message should be present");

  await new Promise((r) => setTimeout(r, 10));

  const calls = getNotifCalls();
  assert.equal(
    calls.notifyCustomerJobAccepted.length,
    0,
    "notifyCustomerJobAccepted must NOT be called when acceptance lost the race",
  );
});

// ── Intermediate-transition tests (en_route, arrived, working) ─────────────────

test("PATCH /jobs/:id status=en_route responds 200 and broadcasts job_status", async () => {
  setup();

  const JOB_ID     = 70;
  const REQUEST_ID = 30;
  const TECH_ID    = 3;

  // DB: fetch existing job — must be 'accepted', owned by TECH_ID
  queueSelect([{
    id:            JOB_ID,
    status:        "accepted",
    technician_id: TECH_ID,
    request_id:    REQUEST_ID,
    payout:        100,
  }]);

  // DB: update jobs returning → updated row
  queueReturning([{
    id:            JOB_ID,
    status:        "en_route",
    technician_id: TECH_ID,
    request_id:    REQUEST_ID,
    payout:        100,
  }]);

  const { status, body } = await patchJob(JOB_ID, { status: "en_route" }, TECH_ID);
  assert.equal(status, 200, "Route should respond 200 for a valid accepted→en_route transition");
  assert.equal(body.status, "en_route", "Response body should reflect the new status");

  // Assert that broadcastToRoom was called with the correct room and payload
  const broadcasts = getBroadcastCalls();
  assert.equal(broadcasts.length, 1, "broadcastToRoom should be called exactly once");
  assert.equal(broadcasts[0].room, `job:${JOB_ID}`, "Broadcast room should be job:<id>");
  assert.deepEqual(broadcasts[0].payload, {
    type:      "job_status",
    jobId:     JOB_ID,
    requestId: REQUEST_ID,
    status:    "en_route",
  }, "Broadcast payload should match job_status shape");
});

test("PATCH /jobs/:id status=arrived responds 200 and broadcasts job_status", async () => {
  setup();

  const JOB_ID     = 71;
  const REQUEST_ID = 31;
  const TECH_ID    = 3;

  // DB: fetch existing job — must be 'en_route', owned by TECH_ID
  queueSelect([{
    id:            JOB_ID,
    status:        "en_route",
    technician_id: TECH_ID,
    request_id:    REQUEST_ID,
    payout:        100,
  }]);

  // DB: update jobs returning → updated row
  queueReturning([{
    id:            JOB_ID,
    status:        "arrived",
    technician_id: TECH_ID,
    request_id:    REQUEST_ID,
    payout:        100,
  }]);

  const { status, body } = await patchJob(JOB_ID, { status: "arrived" }, TECH_ID);
  assert.equal(status, 200, "Route should respond 200 for a valid en_route→arrived transition");
  assert.equal(body.status, "arrived", "Response body should reflect the new status");

  // Assert that broadcastToRoom was called with the correct room and payload
  const broadcasts = getBroadcastCalls();
  assert.equal(broadcasts.length, 1, "broadcastToRoom should be called exactly once");
  assert.equal(broadcasts[0].room, `job:${JOB_ID}`, "Broadcast room should be job:<id>");
  assert.deepEqual(broadcasts[0].payload, {
    type:      "job_status",
    jobId:     JOB_ID,
    requestId: REQUEST_ID,
    status:    "arrived",
  }, "Broadcast payload should match job_status shape");
});

test("PATCH /jobs/:id status=working responds 200, updates serviceRequests to in_progress, and broadcasts job_status", async () => {
  setup();

  const JOB_ID     = 72;
  const REQUEST_ID = 32;
  const TECH_ID    = 3;

  // DB: fetch existing job — must be 'arrived', owned by TECH_ID
  queueSelect([{
    id:            JOB_ID,
    status:        "arrived",
    technician_id: TECH_ID,
    request_id:    REQUEST_ID,
    payout:        100,
  }]);

  // DB: update jobs returning → updated row
  // (the serviceRequests update has no .returning() so no queue entry needed)
  queueReturning([{
    id:            JOB_ID,
    status:        "working",
    technician_id: TECH_ID,
    request_id:    REQUEST_ID,
    payout:        100,
  }]);

  const { status, body } = await patchJob(JOB_ID, { status: "working" }, TECH_ID);
  assert.equal(status, 200, "Route should respond 200 for a valid arrived→working transition");
  assert.equal(body.status, "working", "Response body should reflect the new status");

  // Assert that the serviceRequests table was updated with status: "in_progress"
  const setCalls = getUpdateSetCalls();
  const inProgressCall = setCalls.find((c) => c.status === "in_progress");
  assert.ok(
    inProgressCall,
    "db.update(serviceRequests).set({ status: 'in_progress', ... }) should have been called",
  );

  // Assert that broadcastToRoom was called with the correct room and payload
  const broadcasts = getBroadcastCalls();
  assert.equal(broadcasts.length, 1, "broadcastToRoom should be called exactly once");
  assert.equal(broadcasts[0].room, `job:${JOB_ID}`, "Broadcast room should be job:<id>");
  assert.deepEqual(broadcasts[0].payload, {
    type:      "job_status",
    jobId:     JOB_ID,
    requestId: REQUEST_ID,
    status:    "working",
  }, "Broadcast payload should match job_status shape");
});

// ── Cancelled-transition tests ─────────────────────────────────────────────────

test("PATCH /jobs/:id status=cancelled responds 200, updates serviceRequests to cancelled, and broadcasts job_status", async () => {
  setup();

  const JOB_ID     = 80;
  const REQUEST_ID = 40;
  const TECH_ID    = 4;

  // DB: fetch existing job — must be in a cancellable state, owned by TECH_ID
  queueSelect([{
    id:            JOB_ID,
    status:        "working",
    technician_id: TECH_ID,
    request_id:    REQUEST_ID,
    payout:        200,
  }]);

  // DB: update jobs returning → updated row
  // (the serviceRequests update for cancelled has no .returning(), so no queue entry needed for it)
  queueReturning([{
    id:            JOB_ID,
    status:        "cancelled",
    technician_id: TECH_ID,
    request_id:    REQUEST_ID,
    payout:        200,
  }]);

  const { status, body } = await patchJob(JOB_ID, { status: "cancelled" }, TECH_ID);
  assert.equal(status, 200, "Route should respond 200 for a valid working→cancelled transition");
  assert.equal(body.status, "cancelled", "Response body should reflect the new status");

  // Assert that specifically the serviceRequests table was updated with status: "cancelled"
  // (not just the jobs table, which also receives status: "cancelled" in its update)
  const updateCalls = getUpdateCalls();
  const srCancelledCall = updateCalls.find(
    (c) => c.table === serviceRequests && c.set.status === "cancelled",
  );
  assert.ok(
    srCancelledCall,
    "db.update(serviceRequests).set({ status: 'cancelled', ... }) should have been called",
  );

  // Assert that broadcastToRoom was called with the correct room and payload
  const broadcasts = getBroadcastCalls();
  assert.equal(broadcasts.length, 1, "broadcastToRoom should be called exactly once");
  assert.equal(broadcasts[0].room, `job:${JOB_ID}`, "Broadcast room should be job:<id>");
  assert.deepEqual(broadcasts[0].payload, {
    type:      "job_status",
    jobId:     JOB_ID,
    requestId: REQUEST_ID,
    status:    "cancelled",
  }, "Broadcast payload should match job_status shape");
});

test("PATCH /jobs/:id status=cancelled from accepted state responds 200, updates serviceRequests to cancelled, and broadcasts", async () => {
  setup();

  const JOB_ID     = 81;
  const REQUEST_ID = 41;
  const TECH_ID    = 4;

  // DB: fetch existing job — accepted state is also cancellable
  queueSelect([{
    id:            JOB_ID,
    status:        "accepted",
    technician_id: TECH_ID,
    request_id:    REQUEST_ID,
    payout:        150,
  }]);

  // DB: update jobs returning → updated row
  queueReturning([{
    id:            JOB_ID,
    status:        "cancelled",
    technician_id: TECH_ID,
    request_id:    REQUEST_ID,
    payout:        150,
  }]);

  const { status, body } = await patchJob(JOB_ID, { status: "cancelled" }, TECH_ID);
  assert.equal(status, 200, "Route should respond 200 for a valid accepted→cancelled transition");
  assert.equal(body.status, "cancelled", "Response body should reflect the new status");

  // Assert that specifically the serviceRequests table was updated with status: "cancelled"
  const updateCalls = getUpdateCalls();
  const srCancelledCall = updateCalls.find(
    (c) => c.table === serviceRequests && c.set.status === "cancelled",
  );
  assert.ok(
    srCancelledCall,
    "db.update(serviceRequests).set({ status: 'cancelled', ... }) should have been called",
  );

  const broadcasts = getBroadcastCalls();
  assert.equal(broadcasts.length, 1, "broadcastToRoom should be called exactly once");
  assert.equal(broadcasts[0].room, `job:${JOB_ID}`, "Broadcast room should be job:<id>");
  assert.deepEqual(broadcasts[0].payload, {
    type:      "job_status",
    jobId:     JOB_ID,
    requestId: REQUEST_ID,
    status:    "cancelled",
  }, "Broadcast payload should match job_status shape");
});

test("PATCH /jobs/:id status=cancelled on an already-completed job returns 422", async () => {
  setup();

  const JOB_ID  = 82;
  const TECH_ID = 4;

  // DB: fetch existing job — completed is a terminal state; cannot be cancelled
  queueSelect([{
    id:            JOB_ID,
    status:        "completed",
    technician_id: TECH_ID,
    request_id:    42,
    payout:        200,
  }]);

  const { status, body } = await patchJob(JOB_ID, { status: "cancelled" }, TECH_ID);
  assert.equal(status, 422, "Cancelling a completed job should return 422");
  assert.ok(body.error, "Error message should be present");

  // Ensure the serviceRequests table was NOT updated and no broadcast happened
  const updateCalls = getUpdateCalls();
  const srCancelledCall = updateCalls.find(
    (c) => c.table === serviceRequests && c.set.status === "cancelled",
  );
  assert.equal(srCancelledCall, undefined, "serviceRequests should NOT be updated for a rejected transition");

  const broadcasts = getBroadcastCalls();
  assert.equal(broadcasts.length, 0, "broadcastToRoom should NOT be called for a rejected transition");
});
