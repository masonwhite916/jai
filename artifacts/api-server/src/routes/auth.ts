import { Router, type IRouter } from "express";
import { sendVerification, checkVerification } from "../lib/twilioClient";

const router: IRouter = Router();

// POST /api/auth/send-otp
// Body: { phone: string }
// Sends a 6-digit OTP via WhatsApp using Twilio Verify.
router.post("/auth/send-otp", async (req, res) => {
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
// Body: { phone: string, otp: string }
router.post("/auth/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body as { phone?: string; otp?: string };

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

    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
