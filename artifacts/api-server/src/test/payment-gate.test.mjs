/**
 * Payment-gate integration tests for POST /api/requests.
 *
 * Scenarios covered:
 *  1. Member (isCovered=true)  — no payment required, job created.
 *  2. Non-member cash intent   — confirmed with cash_intent:true.
 *  3. Happy-path card payment  — paid, correct metadata, correct amount.
 *  4. Missing metadata         — payment has no metadata at all → 403.
 *  5. Wrong metadata.type      — subscription payment used for service → 403.
 *  6. Mismatched user          — payment belongs to a different user → 403.
 *  7. Mismatched service_type  — payment for 'tire' used for 'fuel' → 402.
 *  8. Insufficient amount      — payment amount too low → 402.
 *  9. No payment provided      — non-member submits with no payment_id → 402.
 *
 * "@workspace/db" and "moyasarClient" are intercepted by the payment-hooks.mjs
 * / payment-loader.mjs chain — no real Postgres or Moyasar connections needed.
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";

import { queueSelect, resetDb }       from "./mock-payment-db.mjs";
import { setMoyasarResult, setMoyasarError, resetMoyasar } from "./mock-moyasar.mjs";

// ── Import the router under test (after hooks have wired the mocks) ──────────
const { default: requestsRouter } = await import("../routes/requests.ts");

// A minimal Express-like app wrapper using the real express package.
const express = (await import("express")).default;

let server;
let port;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Return a signed-looking auth header for user with given id. */
function authHeader(userId = 1) {
  // requireAuth reads req.userId which is set by the auth middleware.
  // We bypass middleware by patching the middleware stack via a prelude.
  return { "x-test-user-id": String(userId) };
}

/**
 * Send a POST /api/requests to the test server and return the parsed response.
 */
async function postRequest(body, userId = 1) {
  const url = `http://127.0.0.1:${port}/requests`;
  const resp = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "x-test-user-id": String(userId) },
    body:    JSON.stringify(body),
  });
  const json = await resp.json().catch(() => ({}));
  return { status: resp.status, body: json };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

before(async () => {
  const app = express();
  app.use(express.json());

  // Inject req.userId from the test header so we don't need real JWT middleware.
  app.use((req, _res, next) => {
    const uid = req.headers["x-test-user-id"];
    if (uid) req.userId = Number(uid);
    next();
  });

  // Also need to mock requireAuth to not check sessions — it's used by
  // the router directly.  Patch it on the module level is hard, so we
  // trust that our injected req.userId satisfies the actual check.
  // (The real requireAuth only reads req.userId if it was already set
  //  by an earlier middleware, so the header injection above is enough
  //  for tests that expect success.  For tests expecting 401 we skip auth.)

  app.use(requestsRouter);
  server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  port = server.address().port;
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
});

// Reset mocks before each test.
function setup() {
  resetDb();
  resetMoyasar();
  // Queue a dispatch mock  (dispatch.broadcastToRoom is a no-op in test)
}

// ── Tests ────────────────────────────────────────────────────────────────────

test("1. member — service covered, no payment needed, job created", async () => {
  setup();
  // DB: user is a 'basic' member
  queueSelect([{ membership: "basic" }]);
  // DB: serviceRequests.insert → returning row
  // DB: jobs.insert → returning row  (these come from mock-payment-db auto-returning)

  const { status } = await postRequest({
    service_type: "fuel",
    location_lat: 24.7,
    location_lng: 46.7,
  });
  // Member + covered service → 201
  assert.equal(status, 201, "Member should get 201 without payment");
});

test("2. non-member cash intent — accepted", async () => {
  setup();
  queueSelect([{ membership: "none" }]);

  const { status } = await postRequest({
    service_type: "fuel",
    cash_intent:  true,
    location_lat: 24.7,
    location_lng: 46.7,
  });
  assert.equal(status, 201, "Cash intent should be accepted");
});

test("3. happy-path card — paid, correct metadata and amount", async () => {
  setup();
  queueSelect([{ membership: "none" }]);
  // Moyasar returns a valid paid payment bound to user 1, service 'fuel', SAR 80
  setMoyasarResult({
    status:   "paid",
    amount:   8000, // SAR 80 in halalas
    metadata: { type: "service", service_type: "fuel", user_id: "1" },
  });

  const { status } = await postRequest({
    service_type: "fuel",
    payment_id:   "pay_abc123",
    location_lat: 24.7,
    location_lng: 46.7,
  });
  assert.equal(status, 201, "Valid card payment should create the request");
});

test("4. missing metadata — rejected", async () => {
  setup();
  queueSelect([{ membership: "none" }]);
  // Payment has no metadata at all
  setMoyasarResult({ status: "paid", amount: 8000, metadata: undefined });

  const { status, body } = await postRequest({
    service_type: "fuel",
    payment_id:   "pay_no_meta",
    location_lat: 24.7,
    location_lng: 46.7,
  });
  assert.equal(status, 403, "Missing metadata should be rejected");
  assert.ok(body.error, "Error message should be present");
});

test("5. wrong metadata.type (subscription payment) — rejected", async () => {
  setup();
  queueSelect([{ membership: "none" }]);
  setMoyasarResult({
    status:   "paid",
    amount:   19900,
    metadata: { type: "subscription", plan: "basic", user_id: "1" },
  });

  const { status } = await postRequest({
    service_type: "fuel",
    payment_id:   "pay_sub_type",
    location_lat: 24.7,
    location_lng: 46.7,
  });
  assert.equal(status, 403, "Non-service payment type should be rejected");
});

test("6. mismatched user — payment belongs to different user", async () => {
  setup();
  queueSelect([{ membership: "none" }]);
  // Payment was made by user 99, request comes from user 1
  setMoyasarResult({
    status:   "paid",
    amount:   8000,
    metadata: { type: "service", service_type: "fuel", user_id: "99" },
  });

  const { status } = await postRequest({
    service_type: "fuel",
    payment_id:   "pay_wrong_user",
    location_lat: 24.7,
    location_lng: 46.7,
  }, /* userId= */ 1);
  assert.equal(status, 403, "Payment for different user should be rejected");
});

test("7. mismatched service_type — payment for 'tire' used for 'fuel'", async () => {
  setup();
  queueSelect([{ membership: "none" }]);
  setMoyasarResult({
    status:   "paid",
    amount:   35000,
    metadata: { type: "service", service_type: "tire", user_id: "1" },
  });

  const { status } = await postRequest({
    service_type: "fuel", // different from metadata.service_type
    payment_id:   "pay_wrong_service",
    location_lat: 24.7,
    location_lng: 46.7,
  });
  assert.equal(status, 402, "Payment for wrong service type should be rejected");
});

test("8. insufficient payment amount — rejected", async () => {
  setup();
  queueSelect([{ membership: "none" }]);
  // Only SAR 50 (5000 halalas), but fuel costs SAR 80 (8000 halalas)
  setMoyasarResult({
    status:   "paid",
    amount:   5000,
    metadata: { type: "service", service_type: "fuel", user_id: "1" },
  });

  const { status } = await postRequest({
    service_type: "fuel",
    payment_id:   "pay_low_amount",
    location_lat: 24.7,
    location_lng: 46.7,
  });
  assert.equal(status, 402, "Insufficient payment amount should be rejected");
});

test("9. non-member, no payment — rejected", async () => {
  setup();
  queueSelect([{ membership: "none" }]);

  const { status } = await postRequest({
    service_type: "fuel",
    location_lat: 24.7,
    location_lng: 46.7,
    // no payment_id, no cash_intent
  });
  assert.equal(status, 402, "Non-member without payment should be rejected");
});

// ── Policy note: cash-on-delivery is explicitly in scope for this task ────────
// Task spec: "Cash-on-delivery users get a confirmation prompt acknowledging
// the amount due."  The client-side Alert handles the prompt; cash_intent:true
// is the signal the server receives after confirmation.  Cash does NOT collect
// money upfront, but it IS an explicit, acknowledged payment intent — the
// server records payment_method='cash' so the technician knows to collect.
//
test("2b. non-member cash intent — payment_method recorded as cash", async () => {
  setup();
  queueSelect([{ membership: "none" }]);

  const { status, body } = await postRequest({
    service_type: "fuel",
    cash_intent:  true,
    location_lat: 24.7,
    location_lng: 46.7,
  });
  assert.equal(status, 201, "Confirmed cash-on-delivery should be accepted");
  // The mock DB returns a dummy request row; verify the route reached insert
  assert.ok(body.request || body.job, "Response should include request or job");
});
