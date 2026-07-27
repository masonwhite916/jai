/**
 * Payment routes — Moyasar (card / Mada / Apple Pay) + Tabby + Tamara
 *
 * POST /api/payment/checkout          — card payment via Moyasar
 * GET  /api/payment/status/:id        — poll a Moyasar payment
 * POST /api/payment/checkout/tabby    — open Tabby BNPL checkout
 * POST /api/payment/checkout/tamara   — open Tamara BNPL checkout
 * POST /api/payment/webhook           — Moyasar server-to-server callback
 */

import { Router, type IRouter } from "express";
import { moyasarFetch } from "../lib/moyasarClient";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Price per plan in halalas (SAR × 100) */
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/checkout
// Charge a card (Mada / Visa / Mastercard) through Moyasar.
// Body: { plan, cardName, cardNumber, month, year, cvc, callbackUrl }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/payment/checkout", async (req, res) => {
  try {
    const {
      plan,
      cardName,
      cardNumber,
      month,
      year,
      cvc,
      callbackUrl,
    } = req.body as {
      plan: string;
      cardName: string;
      cardNumber: string;
      month: string;
      year: string;
      cvc: string;
      callbackUrl?: string;
    };

    const amount = PLAN_AMOUNTS[plan];
    if (!amount) {
      res.status(400).json({ error: `Unknown plan: ${plan}` });
      return;
    }

    // Strip spaces/dashes from card number before sending to Moyasar
    const cleanNumber = cardNumber.replace(/\D/g, "");

    const payment = (await moyasarFetch("POST", "/payments", {
      amount,
      currency: "SAR",
      description: PLAN_NAMES[plan] ?? plan,
      callback_url: callbackUrl ?? process.env.MOYASAR_CALLBACK_URL ?? "",
      source: {
        type:   "creditcard",
        name:   cardName,
        number: cleanNumber,
        month,
        year,
        cvm:    cvc,      // Moyasar uses "cvm" not "cvc"
      },
    })) as {
      id: string;
      status: string;
      source: { transaction_url?: string };
    };

    res.json({
      paymentId:       payment.id,
      status:          payment.status,             // "initiated" | "paid" | "failed"
      transactionUrl:  payment.source?.transaction_url ?? null, // 3DS redirect, if any
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment error";
    console.error("[payment] checkout error:", err);
    res.status(500).json({ error: message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payment/status/:id
// Poll a Moyasar payment by ID.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/payment/status/:id", async (req, res) => {
  try {
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
            success:     process.env.PAYMENT_SUCCESS_URL ?? "https://example.com/payment-success",
            failure:     process.env.PAYMENT_CANCEL_URL  ?? "https://example.com/payment-cancel",
            cancel:      process.env.PAYMENT_CANCEL_URL  ?? "https://example.com/payment-cancel",
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
// Returns an HTML page with Moyasar.js initialised for Apple Pay.
// Open this URL in expo-web-browser on iOS — Safari handles the native
// Apple Pay sheet and Moyasar.js sends the token to Moyasar's servers.
//
// Requires in Moyasar dashboard: Apple Pay enabled + Merchant ID registered.
// Requires env var: APPLE_PAY_MERCHANT_ID  (from Apple Developer portal)
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
//
// To activate: add APPLE_PAY_MERCHANT_ID, APPLE_PAY_CERT_PEM, APPLE_PAY_KEY_PEM
// as secrets (from Apple Developer → Certificates, Identifiers & Profiles).
// See: https://developer.apple.com/documentation/apple_pay_on_the_web/providing_merchant_validation
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

    // Mutual TLS with Apple using your merchant certificate + private key
    // (stored as PEM strings in APPLE_PAY_CERT_PEM / APPLE_PAY_KEY_PEM secrets)
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
// Moyasar server-to-server callback — marks subscription active on paid status.
// Moyasar sends the secret token in the Authorization header as a Bearer token.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/payment/webhook", async (req, res) => {
  // Verify the request is genuinely from Moyasar
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
      metadata?: { userId?: string; plan?: string };
    };

    console.log(`[payment/webhook] payment ${id} → ${status}`);

    if (status === "paid" && metadata?.userId && metadata?.plan) {
      await db
        .update(users)
        .set({ membership: metadata.plan as any, updated_at: new Date() })
        .where(eq(users.id, Number(metadata.userId)));
    }

    res.json({ received: true });
  } catch (err) {
    console.error("[payment/webhook] error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
