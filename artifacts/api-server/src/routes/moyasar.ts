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
// POST /api/payment/webhook
// Moyasar server-to-server callback — marks subscription active on paid status.
// Moyasar sends: { id, status, metadata, ... }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/payment/webhook", async (req, res) => {
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
