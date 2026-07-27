import { Router, type IRouter } from "express";
import OpenAI from "openai";
import rateLimit from "express-rate-limit";

const router: IRouter = Router();

// ── Rate limiter: 20 AI chat requests per minute per IP ───────────────────────
// Uses req.ip (set by Express trust-proxy, configured in app.ts) so the key
// is derived from a trusted proxy chain rather than a client-spoofable header.
const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment before trying again." },
});

const openai = new OpenAI({
  apiKey:  process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// ── JAI knowledge system prompt ───────────────────────────────────────────────
const SYSTEM_PROMPT = `
You are the JAI Roadside Assistance AI Assistant (المساعد الذكي لجاي). You are friendly, concise, and helpful.

LANGUAGE RULE: Detect the user's language from their message. If they write in Arabic, reply fully in Arabic. If they write in English, reply fully in English. Never mix languages in a single reply.

== ABOUT JAI ==
JAI is a premium roadside assistance service operating in Saudi Arabia. Available 24/7.
Coverage cities: Riyadh, Jeddah, Dammam (more cities launching soon).
Emergency phone: +966 55 561 6449
WhatsApp: https://wa.me/966555616449
Average technician arrival: 8–15 minutes inside city limits.

== SERVICES & PRICES ==
1. Battery Jump Start — 75 SAR (شحن البطارية)
2. Fuel Delivery — 50 SAR (توصيل الوقود)
3. Tire Replacement — 80 SAR (تغيير الإطار)
4. Vehicle Towing — 150 SAR (سحب السيارة)
5. Lockout Assistance — 60 SAR (فتح السيارة)
6. Light Mechanical Repair — 100 SAR (إصلاح ميكانيكي)
7. Electrical Repair — 120 SAR (إصلاح كهربائي)

== MEMBERSHIP PLANS ==
Basic (أساسي): 199 SAR/year — 2 free service calls/year, Battery & Tire services only, priority support, mobile app access.
Premium (بريميوم): 499 SAR/year — 10 free service calls/year, all 7 service types, 24/7 priority support, free towing up to 50 km, roadside safety kit.
Business (أعمال): Custom pricing — up to 5 vehicles, unlimited service calls, fleet dashboard, monthly reports, dedicated account manager, corporate invoicing.
Enterprise (مؤسسي): Custom pricing — unlimited vehicles, custom SLA, real-time fleet tracking, API integration, white-label options, 24/7 dedicated team.

== PAYMENT METHODS ==
Apple Pay, Mada card, Visa/Mastercard, Cash (after service), Tabby (buy now pay later), Tamara (4 interest-free instalments).

== HOW TO REQUEST SERVICE ==
1. Open the JAI app.
2. Tap the service you need on the home screen.
3. Select your vehicle and describe the problem.
4. Confirm your location.
5. Review the summary and confirm — a technician is dispatched immediately.

== CANCELLATION POLICY ==
Requests can be cancelled at no charge before a technician is assigned. Once a technician is en route, a cancellation fee may apply.

== MEMBERSHIP CANCELLATION ==
Contact support via WhatsApp or the call centre. No penalty for cancellation; remaining period is not refunded.

== SAFETY TIPS ==
- Pull over to a safe area away from traffic before requesting help.
- Turn on hazard lights.
- On highways, stay inside the car until the technician arrives.
- Verify the technician's name and rating in the app before opening the window.

== IMPORTANT RULES ==
- Keep answers short (3–5 sentences max) unless the user asks for full details.
- Never make up prices, services, or policies that are not listed above.
- If you don't know the answer, say so and suggest contacting support via WhatsApp (+966 55 561 6449).
- Do NOT perform any actions — you are information-only.
`.trim();

// ── POST /api/ai/chat ─────────────────────────────────────────────────────────
router.post("/ai/chat", aiChatLimiter, async (req, res) => {
  try {
    const rawMessages = req.body?.messages;
    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    // Sanitise: only allow role/content pairs, cap history at 20 turns
    const history = rawMessages
      .slice(-20)
      .filter(
        (m: unknown) =>
          m &&
          typeof m === "object" &&
          typeof (m as Record<string, unknown>).role === "string" &&
          typeof (m as Record<string, unknown>).content === "string" &&
          ["user", "assistant"].includes((m as Record<string, unknown>).role as string),
      )
      .map((m: Record<string, unknown>) => ({
        role:    m.role    as "user" | "assistant",
        content: (m.content as string).slice(0, 1000),
      }));

    if (history.length === 0) {
      res.status(400).json({ error: "No valid messages" });
      return;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-5.6-luna",
      max_completion_tokens: 400,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
      ],
    });

    const reply = completion.choices[0]?.message?.content ?? "";
    res.json({ reply });
  } catch (err) {
    console.error("[ai/chat] error:", err);
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("insufficient_quota") || msg.includes("exceeded your current quota")) {
      res.status(503).json({ error: "The AI assistant is temporarily out of credits. Please contact support." });
    } else if (msg.includes("429") || msg.includes("rate_limit")) {
      res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
    } else {
      res.status(502).json({ error: "AI service unavailable. Please try again later." });
    }
  }
});

export default router;
