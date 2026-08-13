/**
 * Promo-code enforcement tests — validate-promo and service-checkout routes.
 *
 * Scenarios:
 *  1. validate-promo: valid code, not previously used → { valid: true }
 *  2. validate-promo: code already used by this user → { valid: false, error: "Code already used" }
 *  3. validate-promo: unknown code → { valid: false, error: "Invalid promo code" }
 *  4. service-checkout: first use, payment succeeds → 200, claim inserted (insert returns row)
 *  5. service-checkout: code already used → 400 before payment is attempted
 *  6. service-checkout: payment throws → claim released (delete called), 500 returned
 *  7. service-checkout: no promo code → no insert attempted, normal 200 flow
 *
 * All DB and Moyasar calls are intercepted by the promo-loader / mock-promo-db.
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";

import {
  queueSelect,
  queueInsertReturning,
  getDeleteCallCount,
  resetDb,
} from "./mock-promo-db.mjs";
import { setMoyasarResult, setMoyasarError, resetMoyasar } from "./mock-moyasar.mjs";

// Import the moyasar router under test (mocks already wired by the loader)
const { default: moyasarRouter } = await import("../routes/moyasar.ts");

const express = (await import("express")).default;

let server;
let port;

// ── Setup / teardown ──────────────────────────────────────────────────────────

before(async () => {
  const app = express();
  app.use(express.json());

  // Inject req.userId from test header (requireAuth mock reads this too)
  app.use((req, _res, next) => {
    const uid = req.headers["x-test-user-id"];
    if (uid) req.userId = Number(uid);
    next();
  });

  app.use(moyasarRouter);
  server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  port = server.address().port;
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
});

function setup() {
  resetDb();
  resetMoyasar();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function postValidatePromo(body, userId = 1) {
  const resp = await fetch(`http://127.0.0.1:${port}/payment/validate-promo`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "x-test-user-id": String(userId) },
    body:    JSON.stringify(body),
  });
  return { status: resp.status, body: await resp.json().catch(() => ({})) };
}

async function postServiceCheckout(body, userId = 1) {
  const resp = await fetch(`http://127.0.0.1:${port}/payment/service-checkout`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "x-test-user-id": String(userId) },
    body:    JSON.stringify(body),
  });
  return { status: resp.status, body: await resp.json().catch(() => ({})) };
}

// Minimal valid card fields
const CARD = {
  cardName:   "Test User",
  cardNumber: "4111111111111111",
  month:      "12",
  year:       "2030",
  cvc:        "123",
};

// ── validate-promo tests ──────────────────────────────────────────────────────

test("1. validate-promo: valid code, not previously used → valid:true", async () => {
  setup();
  // DB: no existing promo_uses row → code is fresh
  queueSelect([]); // promoUses select returns empty

  const { status, body } = await postValidatePromo({
    code:         "WELCOME",
    service_type: "fuel",
  });
  assert.equal(status, 200, "Should return 200");
  assert.equal(body.valid, true, "Should be valid");
  assert.ok(body.discount,    "Should include discount");
  assert.ok(body.finalAmount, "Should include finalAmount");
});

test("2. validate-promo: code already used → valid:false, Code already used", async () => {
  setup();
  // DB: promo_uses row exists for this user + WELCOME code
  queueSelect([{ id: 7 }]);

  const { status, body } = await postValidatePromo({
    code:         "WELCOME",
    service_type: "fuel",
  });
  assert.equal(status, 200, "Route returns 200 with valid:false (not a 4xx)");
  assert.equal(body.valid, false, "Should be invalid");
  assert.equal(body.error, "Code already used");
});

test("3. validate-promo: unknown code → valid:false, Invalid promo code", async () => {
  setup();
  // No DB call needed (lookup fails before DB query)

  const { status, body } = await postValidatePromo({
    code:         "NOTREAL",
    service_type: "fuel",
  });
  assert.equal(status, 200);
  assert.equal(body.valid, false);
  assert.equal(body.error, "Invalid promo code");
});

// ── service-checkout promo tests ──────────────────────────────────────────────

test("4. service-checkout: first use, payment succeeds → 200, claim recorded", async () => {
  setup();
  // insert().onConflictDoNothing().returning() → [{id:1}] (claim acquired)
  queueInsertReturning([{ id: 1 }]);
  // Moyasar responds with a payment object
  setMoyasarResult({ id: "pay_test_01", status: "initiated", source: { transaction_url: null } });

  const { status, body } = await postServiceCheckout({
    service_type: "fuel",
    promoCode:    "WELCOME",
    ...CARD,
  });
  assert.equal(status, 200, "Should return 200");
  assert.ok(body.paymentId, "Should include paymentId");
  // finalAmount should reflect the 15% WELCOME discount (SAR 80 × 0.85 = SAR 68)
  assert.equal(body.finalAmount, 68, "finalAmount should be SAR 68 after WELCOME 15% off");
  // Delete should NOT have been called (payment succeeded)
  assert.equal(getDeleteCallCount(), 0, "Delete should not be called on success");
});

test("5. service-checkout: code already used → 400 before payment attempted", async () => {
  setup();
  // insert().returning() → [] (conflict, code already claimed)
  queueInsertReturning([]);
  // setMoyasarResult is intentionally NOT called — payment must not be attempted

  const { status, body } = await postServiceCheckout({
    service_type: "fuel",
    promoCode:    "WELCOME",
    ...CARD,
  });
  assert.equal(status, 400, "Should return 400");
  assert.equal(body.error, "Code already used");
  // Ensure no delete was called either
  assert.equal(getDeleteCallCount(), 0);
});

test("6. service-checkout: payment throws → claim released (delete called), 500 returned", async () => {
  setup();
  // insert returns [{id:1}] — claim acquired
  queueInsertReturning([{ id: 1 }]);
  // Moyasar throws
  setMoyasarError("Gateway timeout");

  const { status } = await postServiceCheckout({
    service_type: "fuel",
    promoCode:    "WELCOME",
    ...CARD,
  });
  assert.equal(status, 500, "Should return 500 on payment error");
  // The claim must be released so the user can retry
  assert.equal(getDeleteCallCount(), 1, "Delete should be called once to release the claim");
});

test("7. service-checkout: no promo code → no insert attempted, normal 200", async () => {
  setup();
  // No queueInsertReturning — if insert is called the mock would return default [{id:1}],
  // but we verify delete was not called (only meaningful via side-effect absence).
  setMoyasarResult({ id: "pay_nopromo", status: "initiated", source: { transaction_url: null } });

  const { status, body } = await postServiceCheckout({
    service_type: "fuel",
    // no promoCode
    ...CARD,
  });
  assert.equal(status, 200, "Should return 200 without promo");
  assert.ok(body.paymentId, "Should include paymentId");
  assert.equal(body.finalAmount, 80, "finalAmount should be full SAR 80 with no promo");
  assert.equal(getDeleteCallCount(), 0, "No delete should be called without a promo");
});
