import { Router, type IRouter } from "express";
import { sendSms } from "../lib/twilioClient";

const router: IRouter = Router();

// ── In-memory OTP store ───────────────────────────────────────────────────────
// { phone → { code, expiresAt } }
const otpStore = new Map<string, { code: string; expiresAt: number }>();

function generateOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000)); // 4-digit
}

function normalizePhone(raw: string): string {
  // Accept digits only; prepend +966 if not already international
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("966")) return `+${digits}`;
  if (digits.startsWith("0")) return `+966${digits.slice(1)}`;
  return `+966${digits}`;
}

// POST /api/auth/send-otp
// Body: { phone: string }
router.post("/auth/send-otp", async (req, res) => {
  try {
    const { phone } = req.body as { phone?: string };
    if (!phone || phone.replace(/\D/g, "").length < 9) {
      res.status(400).json({ error: "Invalid phone number" });
      return;
    }

    const normalized = normalizePhone(phone);
    const code = generateOtp();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(normalized, { code, expiresAt });

    await sendSms(
      normalized,
      `رمز التحقق الخاص بك لـ JAI هو: ${code}\nYour JAI verification code is: ${code}`,
    );

    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// POST /api/auth/verify-otp
// Body: { phone: string, otp: string }
router.post("/auth/verify-otp", (req, res) => {
  const { phone, otp } = req.body as { phone?: string; otp?: string };

  if (!phone || !otp) {
    res.status(400).json({ error: "phone and otp are required" });
    return;
  }

  const normalized = normalizePhone(phone);
  const record = otpStore.get(normalized);

  if (!record) {
    res.status(400).json({ error: "No OTP found for this number. Please request a new code." });
    return;
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalized);
    res.status(400).json({ error: "OTP has expired. Please request a new code." });
    return;
  }

  if (otp !== record.code) {
    res.status(400).json({ error: "Incorrect code. Please try again." });
    return;
  }

  otpStore.delete(normalized); // single-use
  res.json({ ok: true, phone: normalized });
});

export default router;
