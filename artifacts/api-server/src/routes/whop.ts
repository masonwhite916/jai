import { Router, type IRouter } from "express";
import { whopFetch } from "../lib/whopClient";

const router: IRouter = Router();

const PLAN_IDS: Record<string, string | undefined> = {
  basic: process.env.WHOP_PLAN_BASIC,
  accidents: process.env.WHOP_PLAN_ACCIDENTS,
  rental: process.env.WHOP_PLAN_RENTAL,
};

// Reverse map: plan_id → plan key (basic | accidents | rental)
const PLAN_ID_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(PLAN_IDS).filter(([, v]) => v).map(([k, v]) => [v as string, k])
);

// POST /api/whop/checkout
// Body: { plan: 'basic'|'accidents'|'rental', redirect_url: string }
router.post("/whop/checkout", async (req, res) => {
  try {
    const { plan, redirect_url } = req.body as {
      plan: string;
      redirect_url: string;
      [key: string]: unknown;
    };

    const plan_id = PLAN_IDS[plan];
    if (!plan_id) {
      res.status(400).json({ error: `Unknown plan: ${plan}` });
      return;
    }

    if (!redirect_url) {
      res.status(400).json({ error: "redirect_url is required" });
      return;
    }

    const checkout = (await whopFetch("POST", "/api/v1/checkout_configurations", {
      plan_id,
      redirect_url,
    })) as { id: string; purchase_url: string };

    res.json({
      purchase_url: checkout.purchase_url,
      checkout_id: checkout.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// GET /api/whop/membership-status?email=...
// Returns { active: bool, plan: 'basic'|'accidents'|'rental'|null }
router.get("/whop/membership-status", async (req, res) => {
  try {
    const { email } = req.query as { email?: string };

    if (!email) {
      res.status(400).json({ error: "email is required" });
      return;
    }

    // Fetch memberships filtered by email — checks all our known product plans
    const productIds = [
      process.env.WHOP_PRODUCT_BASIC,
      process.env.WHOP_PRODUCT_ACCIDENTS,
      process.env.WHOP_PRODUCT_RENTAL,
    ].filter(Boolean);

    // List active memberships; Whop doesn't filter by email directly so we
    // fetch recent memberships and look for a match.
    const result = (await whopFetch("GET", "/api/v1/memberships?status=active&limit=50")) as {
      data?: Array<{ id: string; plan_id: string; status: string; user?: { email?: string } }>;
    };

    const memberships = result.data ?? [];
    const match = memberships.find(
      (m) =>
        m.status === "active" &&
        m.user?.email?.toLowerCase() === email.toLowerCase() &&
        PLAN_ID_TO_KEY[m.plan_id]
    );

    if (match) {
      res.json({ active: true, plan: PLAN_ID_TO_KEY[match.plan_id] ?? null });
    } else {
      res.json({ active: false, plan: null });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
