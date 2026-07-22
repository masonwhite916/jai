import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { sendVerification, checkVerification, normalizePhone } from "../lib/taqnyatClient";
import { generateToken, tokenExpiresAt } from "../lib/tokenAuth";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";

// Max 5 OTP requests per phone-derived IP per 10 minutes
const otpLimiter = rateLimit({
  windowMs:         10 * 60 * 1000,
  max:              5,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: "Too many OTP requests. Please wait before trying again." },
});

const router: IRouter = Router();

// Server-side invite code gate for new technician accounts.
// Fail-closed: if TECHNICIAN_INVITE_CODE is not set, technician signup is disabled.
// Existing users' roles are NEVER changed via OTP flow.
const TECH_INVITE_CODE: string | undefined = process.env.TECHNICIAN_INVITE_CODE;

// POST /api/auth/send-otp
// Body: { phone: string }
router.post("/auth/send-otp", otpLimiter, async (req, res) => {
  try {
    const { phone } = req.body as { phone?: string };
    if (!phone || phone.replace(/\D/g, "").length < 9) {
      res.status(400).json({ error: "Invalid phone number" });
      return;
    }
    const normalised = await sendVerification(phone);
    res.json({ ok: true, phone: normalised });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// POST /api/auth/verify-otp
// Body: { phone, otp, name?, invite_code? }
//
// Role policy:
//   - Existing user → role is NEVER changed; invite_code ignored.
//   - New user + valid invite_code → role = 'technician'.
//   - New user, no/invalid code   → role = 'customer'.
//
// Returns: { ok, token, user }
router.post("/auth/verify-otp", async (req, res) => {
  try {
    const {
      phone, otp, name, invite_code,
    } = req.body as {
      phone?: string;
      otp?: string;
      name?: string;
      invite_code?: string;
    };

    if (!phone || !otp) {
      res.status(400).json({ error: "phone and otp are required" });
      return;
    }

    const { valid, status } = await checkVerification(phone, otp);

    if (status === "expired") {
      res.status(400).json({ error: "Code has expired. Please request a new one." });
      return;
    }
    if (!valid) {
      res.status(400).json({ error: "Incorrect code. Please try again." });
      return;
    }

    // Canonicalize phone to E.164 — same transform used by send-otp and Twilio Verify.
    // All DB lookups and inserts use the canonical form to prevent identity aliasing.
    const canonicalPhone = normalizePhone(phone);

    const token     = generateToken();
    const expiresAt = tokenExpiresAt();

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.phone, canonicalPhone))
      .limit(1);

    let user;
    if (existing.length) {
      // Existing user — preserve role; only safe personal fields may be updated.
      const updates: Partial<typeof users.$inferInsert> = {
        auth_token:       token,
        token_expires_at: expiresAt,
        updated_at:       new Date(),
      };
      if (name) updates.name = name;
      // role is intentionally NOT updated here.

      [user] = await db
        .update(users)
        .set(updates)
        .where(eq(users.phone, canonicalPhone))
        .returning();
    } else {
      // New user — role granted only when a valid server-configured invite code is
      // supplied. Fail-closed: if TECHNICIAN_INVITE_CODE is not configured, all
      // new accounts become 'customer'.
      const isValidCode =
        TECH_INVITE_CODE !== undefined &&
        TECH_INVITE_CODE.length > 0 &&
        typeof invite_code === "string" &&
        invite_code.trim() === TECH_INVITE_CODE;

      const role: "customer" | "technician" = isValidCode ? "technician" : "customer";

      [user] = await db
        .insert(users)
        .values({
          phone:            canonicalPhone,
          name:             name ?? null,
          role,
          auth_token:       token,
          token_expires_at: expiresAt,
        })
        .returning();
    }

    res.json({
      ok: true,
      token,
      user: {
        id:            String(user.id),
        phone:         user.phone,
        name:          user.name ?? "Guest",
        role:          user.role,
        membership:    user.membership,
        points:        user.points,
        rating:        user.rating,
        jobsCompleted: user.jobs_completed,
        vehicles:      [],
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
