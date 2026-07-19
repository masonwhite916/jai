import { Router, type IRouter } from "express";
import { whopFetch } from "../lib/whopClient";

const router: IRouter = Router();

const PLAN_IDS: Record<string, string | undefined> = {
  basic: process.env.WHOP_PLAN_BASIC,
  accidents: process.env.WHOP_PLAN_ACCIDENTS,
  rental: process.env.WHOP_PLAN_RENTAL,
};

// POST /api/whop/checkout
// Body: { plan: 'basic'|'accidents'|'rental', redirect_url: string, ...subscriber metadata }
router.post("/whop/checkout", async (req, res) => {
  try {
    const { plan, redirect_url, ...meta } = req.body as {
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

export default router;
