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

import { queueSelect, queueReturning, resetDb } from "./mock-jobs-db.mjs";
import { getNotifCalls, resetNotifCalls }        from "./mock-push-notif.mjs";

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
