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

// GET /api/whop/membership-status?email=...&plan=...
// Query: email (required), plan (optional: 'basic'|'accidents'|'rental')
// Returns: { active: boolean, plan: string|null, membership?: object }
router.get("/whop/membership-status", async (req, res) => {
  try {
    const { email, plan } = req.query as { email?: string; plan?: string };

    if (!email) {
      res.status(400).json({ error: "email is required" });
      return;
    }

    // Optionally filter by plan_id to narrow results
    const plan_id = plan ? PLAN_IDS[plan] : undefined;

    const params = new URLSearchParams({ status: "active", per: "50" });
    if (plan_id) params.set("plan_id", plan_id);

    const result = (await whopFetch(
      "GET",
      `/api/v1/memberships?${params.toString()}`,
    )) as {
      data?: Array<{
        id: string;
        status: string;
        plan_id: string;
        user?: { email?: string };
        created_at?: number;
      }>;
      pagination?: { total: number };
    };

    const memberships = result.data ?? [];

    // Find a membership whose user email matches (case-insensitive)
    const normalizedEmail = email.trim().toLowerCase();
    const match = memberships.find(
      (m) =>
        m.status === "active" &&
        m.user?.email?.trim().toLowerCase() === normalizedEmail &&
        PLAN_ID_TO_KEY[m.plan_id],
    );

    if (match) {
      res.json({
        active: true,
        plan: PLAN_ID_TO_KEY[match.plan_id] ?? null,
        membership: match,
      });
    } else {
      res.json({ active: false, plan: null });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
