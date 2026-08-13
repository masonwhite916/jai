/**
 * Payment routes — Moyasar (card / Mada / Apple Pay) + Tabby + Tamara
 *
 * POST /api/payment/checkout                — card payment via Moyasar (subscriptions)
 * GET  /api/payment/status/:id              — poll a Moyasar payment
 * POST /api/payment/service-checkout        — card payment for a one-off service request (auth required)
 * GET  /api/payment/service-applepay-form   — Apple Pay HTML page for a service
 * GET  /api/payment/service-ref-lookup      — poll Apple Pay result by ref token
 * POST /api/payment/checkout/tabby          — open Tabby BNPL checkout
 * POST /api/payment/checkout/tamara         — open Tamara BNPL checkout
 * POST /api/payment/webhook                 — Moyasar server-to-server callback
 */

import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { moyasarFetch } from "../lib/moyasarClient";
import { db } from "@workspace/db";
import { users, vehicles, servicePaymentRefs, applePaySessions, promoUses } from "@workspace/db/schema";
import { and, eq, gt } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { toVehicleDto } from "../lib/vehicleDto";

// Warn loudly at startup if the webhook secret is not configured —
// without it every POST to /api/payment/webhook is accepted unauthenticated.
if (!process.env.MOYASAR_WEBHOOK_SECRET) {
  console.error(
    "[payment] WARNING: MOYASAR_WEBHOOK_SECRET is not set. " +
    "The webhook endpoint accepts unauthenticated requests. " +
    "Set this env var before going live."
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DB-backed Apple Pay service payment refs (10-min TTL)
// Shared across all server instances/restarts — safe for autoscaled deploys.
// Webhook deposits the completed payment_id; app polls until it appears.
// ─────────────────────────────────────────────────────────────────────────────

export async function registerServicePaymentRef(ref: string, paymentId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  await db
    .insert(servicePaymentRefs)
    .values({ ref, payment_id: paymentId, expires_at: expiresAt })
    .onConflictDoUpdate({ target: servicePaymentRefs.ref, set: { payment_id: paymentId, expires_at: expiresAt } });
}

export async function lookupServicePaymentRef(ref: string): Promise<string | null> {
  const now = new Date();
  const rows = await db
    .select({ payment_id: servicePaymentRefs.payment_id })
    .from(servicePaymentRefs)
    .where(and(
      eq(servicePaymentRefs.ref, ref),
      gt(servicePaymentRefs.expires_at, now),
    ));
  return rows.length ? rows[0].payment_id : null;
}

const router: IRouter = Router();

/**
 * TESTING BYPASS — when PAYMENT_MOCK_MODE=true, all card checkout endpoints
 * succeed instantly without contacting Moyasar (no real charge).
 * Remove the env var once the Moyasar account is activated for live payments.
 */
const MOCK_MODE   = process.env.PAYMENT_MOCK_MODE === "true";
const MOCK_PREFIX = "mock_";

// ─────────────────────────────────────────────────────────────────────────────
// Promo codes
// To add/remove codes, edit PROMO_CODES below and redeploy.
// type 'percent' = X% off, 'fixed' = X SAR off.
// ─────────────────────────────────────────────────────────────────────────────

interface PromoCode {
  discount: number;
  type: "percent" | "fixed";
}

const PROMO_CODES: Record<string, PromoCode> = {
  WELCOME: { discount: 15, type: "percent" },
  SAVE50:  { discount: 50, type: "fixed"   },
  JAI10:   { discount: 10, type: "percent" },
  JAI15:   { discount: 15, type: "percent" },
  JAI20:   { discount: 20, type: "percent" },
  JAI25:   { discount: 25, type: "percent" },
};

/** Look up a promo code (case-insensitive). Returns null if not found. */
export function lookupPromo(raw: string): (PromoCode & { code: string }) | null {
  const code = raw.trim().toUpperCase();
  const promo = PROMO_CODES[code];
  return promo ? { ...promo, code } : null;
}

/** Apply promo discount to a halala amount. Returns discounted amount (≥ 0). */
export function applyPromo(amountHalalas: number, promo: PromoCode): number {
  if (promo.type === "percent") {
    return Math.max(0, Math.round(amountHalalas * (1 - promo.discount / 100)));
  }
  return Math.max(0, amountHalalas - promo.discount * 100); // SAR → halalas
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/validate-promo  (requires auth)
// Validate a promo code against a specific service OR subscription plan.
// Body: { code: string; service_type?: string; plan?: string }
//   Provide exactly one of service_type or plan.
// Returns: { valid: true; discount; type; originalAmount; finalAmount } (SAR)
//       OR { valid: false; error: string }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/payment/validate-promo", requireAuth, async (req, res) => {
  const { code, service_type, plan } = req.body as {
    code?: string;
    service_type?: string;
    plan?: string;
  };

  if (!code || (!service_type && !plan)) {
    res.status(400).json({ valid: false, error: "code and either service_type or plan are required" });
    return;
  }

  let baseAmount: number | undefined;
  if (plan) {
    baseAmount = PLAN_AMOUNTS[plan];
    if (!baseAmount) {
      res.status(400).json({ valid: false, error: `Unknown plan: ${plan}` });
      return;
    }
  } else {
    baseAmount = SERVICE_AMOUNTS[service_type!];
    if (!baseAmount) {
      res.status(400).json({ valid: false, error: `Unknown service_type: ${service_type}` });
      return;
    }
  }

  const promo = lookupPromo(code);
  if (!promo) {
    res.json({ valid: false, error: "Invalid promo code" });
    return;
  }

  // Check if the authenticated user has already used this code
  const existing = await db
    .select({ id: promoUses.id })
    .from(promoUses)
    .where(and(eq(promoUses.user_id, req.userId!), eq(promoUses.code, promo.code)))
    .limit(1);

  if (existing.length > 0) {
    res.json({ valid: false, error: "Code already used" });
    return;
  }

  const finalHalalas = applyPromo(baseAmount, promo);
  res.json({
    valid:          true,
    discount:       promo.discount,
    type:           promo.type,
    originalAmount: baseAmount    / 100, // SAR
    finalAmount:    finalHalalas  / 100, // SAR
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Shared price tables
// ─────────────────────────────────────────────────────────────────────────────

/** Subscription plan prices in halalas (SAR × 100) */
const PLAN_AMOUNTS: Record<string, number> = {
  basic:     19900,   // SAR 199
  accidents: 29900,   // SAR 299
  rental:    60000,   // SAR 600
};

const PLAN_NAMES: Record<string, string> = {
  basic:     "Basic Package — JAI",
  accidents: "Accidents Package — JAI",
  rental:    "Rental Package — JAI",
};

/**
 * Service prices in halalas (SAR × 100).
 * MUST stay in sync with PAYOUTS in requests.ts and SERVICE_INFO.basePrice in [service].tsx.
 */
const SERVICE_AMOUNTS: Record<string, number> = {
  battery:  12000,  // SAR 120
  fuel:      8000,  // SAR 80
  tire:     35000,  // SAR 350
  tow:      50000,  // SAR 500
  lockout:  20000,  // SAR 200
  mechanic: 30000,  // SAR 300
  electric: 28000,  // SAR 280
};

const SERVICE_NAMES: Record<string, string> = {
  battery:  "Battery Jump-start — JAI",
  fuel:     "Fuel Delivery — JAI",
  tire:     "Tyre Change — JAI",
  tow:      "Towing Service — JAI",
  lockout:  "Lockout Assistance — JAI",
  mechanic: "Mobile Mechanic — JAI",
  electric: "Electrical Repair — JAI",
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/checkout  (requires auth)
// Charge a card (Mada / Visa / Mastercard) for a subscription plan.
// Body: { plan, cardName, cardNumber, month, year, cvc, callbackUrl?, promoCode? }
// Embeds userId + plan + promo_code in Moyasar metadata so the webhook and
// /subscription/confirm can activate membership without trusting the client.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/payment/checkout", requireAuth, async (req, res) => {
  try {
    const {
      plan,
      cardName,
      cardNumber,
      month,
      year,
      cvc,
      callbackUrl,
      promoCode,
    } = req.body as {
      plan: string;
      cardName: string;
      cardNumber: string;
      month: string;
      year: string;
      cvc: string;
      callbackUrl?: string;
      promoCode?: string;
    };

    const baseAmount = PLAN_AMOUNTS[plan];
    if (!baseAmount) {
      res.status(400).json({ error: `Unknown plan: ${plan}` });
      return;
    }

    // Resolve promo discount server-side — never trust the client's claimed discount
    let resolvedPromoCode: string | null = null;
    let amount = baseAmount;
    if (promoCode) {
      const promo = lookupPromo(promoCode);
      if (promo) {
        // Check the user hasn't already used this code
        const existing = await db
          .select({ id: promoUses.id })
          .from(promoUses)
          .where(and(eq(promoUses.user_id, req.userId!), eq(promoUses.code, promo.code)))
          .limit(1);

        if (existing.length === 0) {
          amount = applyPromo(baseAmount, promo);
          resolvedPromoCode = promo.code;
        }
        // Already used → silently ignore; charge full price
      }
      // Unknown code → silently ignore
    }

    if (MOCK_MODE) {
      console.warn(`[payment] MOCK MODE — simulating paid subscription for plan "${plan}" (no real charge)`);
      res.json({ paymentId: `${MOCK_PREFIX}${Date.now()}`, status: "paid", transactionUrl: null });
      return;
    }

    const cleanNumber = cardNumber.replace(/\D/g, "");

    const payment = (await moyasarFetch("POST", "/payments", {
      amount,
      currency:     "SAR",
      description:  PLAN_NAMES[plan] ?? plan,
      callback_url: callbackUrl ?? process.env.MOYASAR_CALLBACK_URL ?? "",
      source: {
        type:   "creditcard",
        name:   cardName,
        number: cleanNumber,
        month,
        year,
        cvm:    cvc,      // Moyasar uses "cvm" not "cvc"
      },
      // Bind payment to the authenticated user and plan so the webhook and
      // /subscription/confirm can activate membership without trusting the client.
      // promo_code embedded so confirm can record the use and verify the amount.
      metadata: {
        type:       "subscription",
        userId:     String(req.userId),
        plan,
        promo_code: resolvedPromoCode ?? "",
      },
    })) as {
      id: string;
      status: string;
      source: { transaction_url?: string };
    };

    res.json({
      paymentId:       payment.id,
      status:          payment.status,
      transactionUrl:  payment.source?.transaction_url ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment error";
    console.error("[payment] checkout error:", err);
    res.status(500).json({ error: message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/subscription/confirm  (requires auth)
// Called by the app after /payment/status/:id reports "paid".
// Fetches the payment from Moyasar directly, verifies amount and ownership,
// then activates the membership tier — the client never sets its own tier.
// Body: { paymentId: string; plan: string }
// Returns: { membership: string; user: UserDto }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/payment/subscription/confirm", requireAuth, async (req, res) => {
  try {
    const { paymentId, plan } = req.body as { paymentId?: string; plan?: string };

    if (!paymentId || !plan) {
      res.status(400).json({ error: "paymentId and plan are required" });
      return;
    }

    const baseAmount = PLAN_AMOUNTS[plan];
    if (!baseAmount) {
      res.status(400).json({ error: `Unknown plan: ${plan}` });
      return;
    }

    let confirmedPromoCode: string | null = null;

    if (MOCK_MODE && paymentId.startsWith(MOCK_PREFIX)) {
      // Testing bypass — no real Moyasar payment to verify
      console.warn(`[payment] MOCK MODE — confirming subscription for plan "${plan}"`);
    } else {
      // Fetch the payment from Moyasar and verify it independently
      const payment = (await moyasarFetch("GET", `/payments/${paymentId}`)) as {
        id: string;
        status: string;
        amount: number;
        metadata?: { userId?: string; plan?: string; type?: string; promo_code?: string };
      };

      if (payment.status !== "paid") {
        res.status(402).json({ error: "Payment has not been confirmed as paid yet" });
        return;
      }

      // Verify the payment belongs to the authenticated user
      if (String(payment.metadata?.userId) !== String(req.userId)) {
        console.error(`[payment] ownership mismatch for ${paymentId}: metadata.userId=${payment.metadata?.userId}, req.userId=${req.userId}`);
        res.status(403).json({ error: "Payment does not belong to this account" });
        return;
      }

      // Compute the expected amount, accounting for any promo embedded in metadata
      const metaPromo = payment.metadata?.promo_code ?? "";
      let expectedAmount = baseAmount;
      if (metaPromo) {
        const promo = lookupPromo(metaPromo);
        if (promo) {
          expectedAmount = applyPromo(baseAmount, promo);
          confirmedPromoCode = promo.code;
        }
      }

      if (payment.amount !== expectedAmount) {
        console.error(`[payment] amount mismatch for ${paymentId}: got ${payment.amount}, expected ${expectedAmount}`);
        res.status(400).json({ error: "Payment amount does not match plan price" });
        return;
      }
    }

    // Record promo use so the code cannot be reused by this user on future purchases
    if (confirmedPromoCode) {
      await db
        .insert(promoUses)
        .values({ user_id: req.userId!, code: confirmedPromoCode })
        .onConflictDoNothing();
    }

    // Activate membership server-side
    await db
      .update(users)
      .set({ membership: plan as any, updated_at: new Date() })
      .where(eq(users.id, req.userId!));

    // Return a fresh user snapshot so the client can update state immediately
    const [[u], userVehicles] = await Promise.all([
      db.select().from(users).where(eq(users.id, req.userId!)).limit(1),
      db.select().from(vehicles).where(eq(vehicles.user_id, req.userId!)),
    ]);

    res.json({
      membership: plan,
      user: {
        id:            String(u.id),
        phone:         u.phone,
        name:          u.name ?? "Guest",
        role:          u.role,
        membership:    u.membership,
        points:        u.points,
        rating:        u.rating,
        jobsCompleted: u.jobs_completed,
        earningsTotal: u.earnings_total,
        vehicles:      userVehicles.map(toVehicleDto),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Confirmation error";
    console.error("[payment] subscription/confirm error:", err);
    res.status(500).json({ error: message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payment/status/:id
// Poll a Moyasar payment by ID.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/payment/status/:id", async (req, res) => {
  try {
    const id = req.params.id as string;
    if (MOCK_MODE && id.startsWith(MOCK_PREFIX)) {
      res.json({ paymentId: id, status: "paid", amount: 0, currency: "SAR" });
      return;
    }
    const payment = (await moyasarFetch(
      "GET",
      `/payments/${req.params.id as string}`,
    )) as { id: string; status: string; amount: number; currency: string };

    res.json({
      paymentId: payment.id,
      status:    payment.status,
      amount:    payment.amount,
      currency:  payment.currency,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Status check failed";
    res.status(500).json({ error: message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/service-checkout  (requires auth)
// Charge a card for a one-off service request.
// Body: { service_type, cardName, cardNumber, month, year, cvc, callbackUrl? }
// Embeds user_id + service_type in Moyasar metadata for server-side verification.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/payment/service-checkout", requireAuth, async (req, res) => {
  try {
    const {
      service_type,
      cardName,
      cardNumber,
      month,
      year,
      cvc,
      callbackUrl,
      idempotencyKey,
      promoCode,
    } = req.body as {
      service_type: string;
      cardName: string;
      cardNumber: string;
      month: string;
      year: string;
      cvc: string;
      callbackUrl?: string;
      idempotencyKey?: string;
      promoCode?: string;
    };

    const baseAmount = SERVICE_AMOUNTS[service_type];
    if (!baseAmount) {
      res.status(400).json({ error: `Unknown service_type: ${service_type}` });
      return;
    }

    // Apply promo discount if a valid code was supplied
    const promo = promoCode ? lookupPromo(promoCode) : null;
    const amount = promo ? applyPromo(baseAmount, promo) : baseAmount;

    // ── Atomic promo claim ─────────────────────────────────────────────────
    // Insert the usage row BEFORE charging. If a row for (user_id, code)
    // already exists the DB unique constraint fires and RETURNING returns
    // nothing — we reject immediately without racing against concurrent
    // requests. If payment later fails we delete the claim so the user can
    // retry (including with the same code).
    if (promo) {
      const claimed = await db
        .insert(promoUses)
        .values({ user_id: req.userId!, code: promo.code })
        .onConflictDoNothing({ target: [promoUses.user_id, promoUses.code] })
        .returning({ id: promoUses.id });

      if (claimed.length === 0) {
        res.status(400).json({ error: "Code already used" });
        return;
      }
    }

    if (MOCK_MODE) {
      console.warn(`[payment] MOCK MODE — simulating paid service for "${service_type}" (no real charge)`);
      res.json({ paymentId: `${MOCK_PREFIX}${Date.now()}`, status: "paid", transactionUrl: null, finalAmount: amount / 100 });
      return;
    }

    const cleanNumber = cardNumber.replace(/\D/g, "");

    let payment: { id: string; status: string; source: { transaction_url?: string } };
    try {
      payment = (await moyasarFetch("POST", "/payments", {
        amount,
        currency:     "SAR",
        description:  SERVICE_NAMES[service_type] ?? service_type,
        callback_url: callbackUrl ?? process.env.MOYASAR_CALLBACK_URL ?? "",
        source: {
          type:   "creditcard",
          name:   cardName,
          number: cleanNumber,
          month,
          year,
          cvm:    cvc,
        },
        metadata: {
          type:         "service",
          service_type: service_type,
          user_id:      String(req.userId),
          ...(promo ? { promo_code: promo.code } : {}),
        },
      }, idempotencyKey)) as { id: string; status: string; source: { transaction_url?: string } };
    } catch (paymentErr) {
      // Payment initiation failed — release the promo claim so the user can retry
      if (promo) {
        await db.delete(promoUses).where(
          and(eq(promoUses.user_id, req.userId!), eq(promoUses.code, promo.code))
        );
        console.warn(`[payment] released promo claim for user ${req.userId} code ${promo.code} after payment error`);
      }
      throw paymentErr;
    }

    res.json({
      paymentId:      payment.id,
      status:         payment.status,
      transactionUrl: payment.source?.transaction_url ?? null,
      finalAmount:    amount / 100, // SAR — for the confirmation sheet
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment error";
    console.error("[payment] service-checkout error:", err);
    res.status(500).json({ error: message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/service-applepay-session  (requires auth)
// Creates a short-lived single-use session token that the app embeds in the
// Apple Pay form URL.  This prevents user_id spoofing via open query params.
// Body: { service_type: string; ref: string }
// Returns: { token: string }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/payment/service-applepay-session", requireAuth, async (req, res) => {
  try {
    const { service_type, ref } = req.body as { service_type: string; ref: string };
    if (!service_type || !ref) {
      res.status(400).json({ error: "service_type and ref are required" });
      return;
    }
    if (!SERVICE_AMOUNTS[service_type]) {
      res.status(400).json({ error: `Unknown service_type: ${service_type}` });
      return;
    }

    const token      = randomUUID();
    const expires_at = new Date(Date.now() + 10 * 60_000); // 10 min

    await db.insert(applePaySessions).values({
      token,
      user_id:      req.userId!,
      service_type: service_type,
      ref,
      expires_at,
    });

    res.json({ token });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Session creation failed";
    console.error("[payment] service-applepay-session error:", err);
    res.status(500).json({ error: message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payment/service-applepay-form?token=UUID
// Returns an HTML page with Moyasar.js for Apple Pay (service payment).
// The token was issued by /service-applepay-session (auth-protected), so
// user_id and service_type are read from the DB — never from query params.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/payment/service-applepay-form", async (req, res) => {
  const { token, name, email } = req.query as {
    token?: string; name?: string; email?: string;
  };

  if (!token) {
    res.status(400).send("<p>Missing session token</p>");
    return;
  }

  // Look up session (validates it exists and hasn't expired)
  const now = new Date();
  const sessions = await db
    .select()
    .from(applePaySessions)
    .where(and(
      eq(applePaySessions.token, token),
      gt(applePaySessions.expires_at, now),
    ))
    .limit(1);

  if (!sessions.length) {
    res.status(403).send("<p>Session expired or invalid. Please return to the app and try again.</p>");
    return;
  }

  const session = sessions[0];
  // Consume token (single-use) — delete it so replay is impossible
  await db.delete(applePaySessions).where(eq(applePaySessions.token, token));

  const { service_type, ref, user_id } = session;
  const amount      = SERVICE_AMOUNTS[service_type] ?? 12000;
  const description = SERVICE_NAMES[service_type]   ?? "JAI Service";
  const pubKey      = process.env.MOYASAR_PUBLISHABLE_KEY ?? "";
  const callbackUrl = process.env.MOYASAR_CALLBACK_URL    ?? "";
  const baseUrl     = process.env.API_BASE_URL ?? "https://jaiksa.replit.app";
  // Embed server-controlled user_id — not taken from request
  const safeRef     = ref.replace(/'/g, "\\'");
  const safeUserId  = String(user_id).replace(/'/g, "\\'");
  const safeService = service_type.replace(/'/g, "\\'");
  const safeName    = (name  ?? "").replace(/'/g, "\\'");
  const safeEmail   = (email ?? "").replace(/'/g, "\\'");

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
  <title>JAI — Apple Pay</title>
  <link rel="stylesheet" href="https://cdn.moyasar.com/mpf/1.14.0/moyasar.css">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,sans-serif;background:#F5F3FF;
         min-height:100vh;display:flex;flex-direction:column;
         align-items:center;justify-content:center;padding:32px 24px}
    h1{font-size:20px;color:#2D1B69;margin-bottom:6px;text-align:center}
    p{font-size:14px;color:#6B7280;text-align:center;margin-bottom:8px}
    .amt{font-size:30px;font-weight:700;color:#5B2C91;
         text-align:center;margin-bottom:28px}
    #moyasar-form{width:100%;max-width:380px}
  </style>
</head>
<body>
  <h1>JAI Roadside Assistance</h1>
  <p>${description}</p>
  <div class="amt">${(amount / 100).toFixed(0)} ريال</div>
  <div id="moyasar-form"></div>
  <script src="https://cdn.moyasar.com/mpf/1.14.0/moyasar.js"></script>
  <script>
    Moyasar.init({
      element: '#moyasar-form',
      amount: ${amount},
      currency: 'SAR',
      description: '${description}',
      publishable_api_key: '${pubKey}',
      callback_url: '${callbackUrl}',
      methods: ['applepay'],
      apple_pay: {
        country: 'SA',
        label: 'JAI Roadside Assistance',
        validate_merchant_url: '${baseUrl}/api/payment/applepay-validate',
      },
      metadata: { type: 'service', service_type: '${safeService}', ref: '${safeRef}', user_id: '${safeUserId}', name: '${safeName}', email: '${safeEmail}' },
    });
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payment/service-ref-lookup?ref=UUID
// Poll whether an Apple Pay service payment completed (registered via webhook).
// Returns { paymentId } on success, or { pending: true } while waiting.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/payment/service-ref-lookup", async (req, res) => {
  const { ref } = req.query as { ref?: string };
  if (!ref) {
    res.status(400).json({ error: "ref is required" });
    return;
  }
  try {
    const paymentId = await lookupServicePaymentRef(ref);
    if (paymentId) {
      res.json({ paymentId });
    } else {
      res.json({ pending: true });
    }
  } catch (err) {
    console.error("[payment] service-ref-lookup error:", err);
    res.status(500).json({ error: "Lookup failed" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/checkout/tabby
// Create a Tabby BNPL session.
// Requires env var: TABBY_SECRET_KEY
// Docs: https://docs.tabby.ai/docs/api/create-session
// ─────────────────────────────────────────────────────────────────────────────
router.post("/payment/checkout/tabby", async (req, res) => {
  const tabbyKey = process.env.TABBY_SECRET_KEY;
  if (!tabbyKey) {
    res.status(503).json({ error: "Tabby is not yet configured (add TABBY_SECRET_KEY)" });
    return;
  }

  try {
    const { plan, buyerName, buyerEmail, buyerPhone } = req.body as {
      plan: string;
      buyerName:  string;
      buyerEmail: string;
      buyerPhone: string;
    };

    const amount = PLAN_AMOUNTS[plan];
    if (!amount) {
      res.status(400).json({ error: `Unknown plan: ${plan}` });
      return;
    }

    const amountSAR = (amount / 100).toFixed(2);

    const apiRes = await fetch("https://api.tabby.ai/api/v2/checkout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tabbyKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payment: {
          amount:      amountSAR,
          currency:    "SAR",
          description: PLAN_NAMES[plan] ?? plan,
          buyer: {
            name:  buyerName,
            email: buyerEmail,
            phone: buyerPhone,
          },
          order: {
            reference_id: `jai-${plan}-${Date.now()}`,
            items: [{
              title:      PLAN_NAMES[plan] ?? plan,
              quantity:   1,
              unit_price: amountSAR,
              category:   "subscription",
            }],
          },
        },
        merchant_code: process.env.TABBY_MERCHANT_CODE ?? "",
        lang:          "ar",
        merchant_urls: {
          success: process.env.PAYMENT_SUCCESS_URL ?? "https://example.com/payment-success",
          cancel:  process.env.PAYMENT_CANCEL_URL  ?? "https://example.com/payment-cancel",
          failure: process.env.PAYMENT_CANCEL_URL  ?? "https://example.com/payment-cancel",
        },
      }),
    });

    const data = (await apiRes.json()) as {
      status:       string;
      id:           string;
      configuration?: { available_products?: { installments?: object[] } };
      payment?:     { id: string };
      checkout_url: string;
    };

    if (!apiRes.ok) {
      res.status(apiRes.status).json({ error: (data as any).error ?? "Tabby error" });
      return;
    }

    res.json({ checkoutUrl: data.checkout_url, sessionId: data.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tabby error";
    console.error("[payment] tabby error:", err);
    res.status(500).json({ error: message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/checkout/tamara
// Create a Tamara BNPL checkout.
// Requires env var: TAMARA_TOKEN
// Docs: https://docs.tamara.co/docs/api/create-order
// ─────────────────────────────────────────────────────────────────────────────
router.post("/payment/checkout/tamara", async (req, res) => {
  const tamaraToken = process.env.TAMARA_TOKEN;
  if (!tamaraToken) {
    res.status(503).json({ error: "Tamara is not yet configured (add TAMARA_TOKEN)" });
    return;
  }

  try {
    const { plan, buyerName, buyerEmail, buyerPhone } = req.body as {
      plan: string;
      buyerName:  string;
      buyerEmail: string;
      buyerPhone: string;
    };

    const amount = PLAN_AMOUNTS[plan];
    if (!amount) {
      res.status(400).json({ error: `Unknown plan: ${plan}` });
      return;
    }

    const amountSAR = (amount / 100).toFixed(2);
    const [firstName, ...rest] = buyerName.split(" ");
    const lastName = rest.join(" ") || firstName;

    const apiRes = await fetch(
      `${process.env.TAMARA_BASE_URL ?? "https://api.tamara.co"}/checkout`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tamaraToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_reference_id: `jai-${plan}-${Date.now()}`,
          total_amount:   { amount: amountSAR, currency: "SAR" },
          description:    PLAN_NAMES[plan] ?? plan,
          country_code:   "SA",
          payment_type:   "PAY_BY_INSTALMENTS",
          instalments:    4,
          customer: {
            first_name: firstName,
            last_name:  lastName,
            email:      buyerEmail,
            phone:      buyerPhone,
          },
          items: [{
            name:         PLAN_NAMES[plan] ?? plan,
            reference_id: plan,
            type:         "Digital",
            unit_price:   { amount: amountSAR, currency: "SAR" },
            total_amount: { amount: amountSAR, currency: "SAR" },
            quantity:     1,
          }],
          merchant_url: {
            success:      process.env.PAYMENT_SUCCESS_URL    ?? "https://example.com/payment-success",
            failure:      process.env.PAYMENT_CANCEL_URL     ?? "https://example.com/payment-cancel",
            cancel:       process.env.PAYMENT_CANCEL_URL     ?? "https://example.com/payment-cancel",
            notification: process.env.TAMARA_NOTIFICATION_URL ?? "",
          },
          locale: "ar_SA",
        }),
      },
    );

    const data = (await apiRes.json()) as { checkout_url?: string; order_id?: string };
    if (!apiRes.ok) {
      res.status(apiRes.status).json({ error: (data as any).message ?? "Tamara error" });
      return;
    }

    res.json({ checkoutUrl: data.checkout_url, orderId: data.order_id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tamara error";
    console.error("[payment] tamara error:", err);
    res.status(500).json({ error: message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payment/applepay-form
// Returns an HTML page with Moyasar.js initialised for Apple Pay (subscriptions).
// Open this URL in expo-web-browser on iOS.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/payment/applepay-form", (req, res) => {
  const { plan, name, email } = req.query as {
    plan?: string; name?: string; email?: string;
  };

  const amount      = PLAN_AMOUNTS[plan ?? "basic"] ?? 19900;
  const description = PLAN_NAMES[plan ?? "basic"]   ?? "JAI Subscription";
  const pubKey      = process.env.MOYASAR_PUBLISHABLE_KEY ?? "";
  const callbackUrl = process.env.MOYASAR_CALLBACK_URL    ?? "";
  const baseUrl     = process.env.API_BASE_URL ?? "https://jaiksa.replit.app";
  const safeName    = (name  ?? "").replace(/'/g, "\\'");
  const safeEmail   = (email ?? "").replace(/'/g, "\\'");

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
  <title>JAI — Apple Pay</title>
  <link rel="stylesheet" href="https://cdn.moyasar.com/mpf/1.14.0/moyasar.css">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,sans-serif;background:#F5F3FF;
         min-height:100vh;display:flex;flex-direction:column;
         align-items:center;justify-content:center;padding:32px 24px}
    h1{font-size:20px;color:#2D1B69;margin-bottom:6px;text-align:center}
    p{font-size:14px;color:#6B7280;text-align:center;margin-bottom:8px}
    .amt{font-size:30px;font-weight:700;color:#5B2C91;
         text-align:center;margin-bottom:28px}
    #moyasar-form{width:100%;max-width:380px}
  </style>
</head>
<body>
  <h1>JAI Roadside Assistance</h1>
  <p>${description}</p>
  <div class="amt">${(amount / 100).toFixed(0)} ريال</div>
  <div id="moyasar-form"></div>
  <script src="https://cdn.moyasar.com/mpf/1.14.0/moyasar.js"></script>
  <script>
    Moyasar.init({
      element: '#moyasar-form',
      amount: ${amount},
      currency: 'SAR',
      description: '${description}',
      publishable_api_key: '${pubKey}',
      callback_url: '${callbackUrl}',
      methods: ['applepay'],
      apple_pay: {
        country: 'SA',
        label: 'JAI Roadside Assistance',
        validate_merchant_url: '${baseUrl}/api/payment/applepay-validate',
      },
      metadata: { plan: '${plan ?? "basic"}', name: '${safeName}', email: '${safeEmail}' },
    });
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/applepay-validate
// Proxies Apple Pay merchant session validation to Apple's servers.
// Called automatically by Moyasar.js inside the Safari payment sheet.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/payment/applepay-validate", async (req, res) => {
  const merchantId = process.env.APPLE_PAY_MERCHANT_ID;
  if (!merchantId) {
    res.status(503).json({
      error:
        "Apple Pay merchant not configured. Add APPLE_PAY_MERCHANT_ID, " +
        "APPLE_PAY_CERT_PEM, and APPLE_PAY_KEY_PEM as secrets.",
    });
    return;
  }

  try {
    const { validationURL } = req.body as { validationURL: string };
    if (!validationURL?.startsWith("https://apple-pay-gateway")) {
      res.status(400).json({ error: "Invalid Apple Pay validation URL" });
      return;
    }

    const https = await import("https");
    const cert  = process.env.APPLE_PAY_CERT_PEM ?? "";
    const key   = process.env.APPLE_PAY_KEY_PEM  ?? "";

    const payload = JSON.stringify({
      merchantIdentifier: merchantId,
      displayName:        "JAI Roadside Assistance",
      initiative:         "web",
      initiativeContext:  req.headers.origin ?? "jaiksa.replit.app",
    });

    const response = await new Promise<string>((resolve, reject) => {
      const url = new URL(validationURL);
      const reqOpts = {
        hostname: url.hostname,
        path:     url.pathname + url.search,
        method:   "POST",
        cert,
        key,
        headers: {
          "Content-Type":   "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      };
      const r = https.request(reqOpts, (appleRes) => {
        let data = "";
        appleRes.on("data", (chunk) => { data += chunk; });
        appleRes.on("end", () => resolve(data));
      });
      r.on("error", reject);
      r.write(payload);
      r.end();
    });

    res.setHeader("Content-Type", "application/json");
    res.send(response);
  } catch (err) {
    console.error("[applepay-validate] error:", err);
    res.status(500).json({ error: "Merchant validation failed" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/webhook
// Moyasar server-to-server callback.
// Handles both subscription activations and service Apple Pay ref registration.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/payment/webhook", async (req, res) => {
  const expectedSecret = process.env.MOYASAR_WEBHOOK_SECRET;
  if (expectedSecret) {
    const authHeader = (req.headers["authorization"] ?? "").toString();
    const incoming   = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (incoming !== expectedSecret) {
      console.warn("[payment/webhook] rejected — invalid secret token");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  try {
    const { id, status, metadata } = req.body as {
      id: string;
      status: string;
      metadata?: { userId?: string; plan?: string; type?: string; ref?: string };
    };

    console.log(`[payment/webhook] payment ${id} → ${status}`);

    if (status === "paid") {
      // ── Subscription payment ──────────────────────────────────────────────
      if (metadata?.userId && metadata?.plan && metadata?.type !== "service") {
        // Verify the payment amount matches the expected plan price before activating
        const expectedAmount = PLAN_AMOUNTS[metadata.plan];
        const paymentAmount  = (req.body as { amount?: number }).amount;
        if (expectedAmount && paymentAmount && paymentAmount !== expectedAmount) {
          console.error(`[payment/webhook] amount mismatch for ${id}: got ${paymentAmount}, expected ${expectedAmount} — skipping activation`);
        } else {
          await db
            .update(users)
            .set({ membership: metadata.plan as any, updated_at: new Date() })
            .where(eq(users.id, Number(metadata.userId)));
        }
      }

      // ── Service Apple Pay payment — register ref for polling (DB-backed) ─
      if (metadata?.type === "service" && metadata?.ref) {
        await registerServicePaymentRef(metadata.ref, id);
        console.log(`[payment/webhook] registered service ref ${metadata.ref} → ${id}`);
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("[payment/webhook] error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
