// Server-side only — do NOT import in frontend code
// Uses Twilio Verify (verify.twilio.com) via the Replit connectors proxy.

import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();

function getServiceSid(): string {
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid) throw new Error("TWILIO_VERIFY_SERVICE_SID env var is not set");
  return sid;
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("966")) return `+${digits}`;
  if (digits.startsWith("0")) return `+966${digits.slice(1)}`;
  return `+966${digits}`;
}

/**
 * Send a WhatsApp OTP to the given phone number via Twilio Verify.
 * `phone` can be a local Saudi number (05xxxxxxxx) or E.164 (+966xxxxxxxx).
 */
export async function sendVerification(phone: string): Promise<string> {
  const sid = getServiceSid();
  const to = normalizePhone(phone);

  const resp = await connectors.proxy(
    "twilio",
    `/v2/Services/${sid}/Verifications`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: to, Channel: "whatsapp" }).toString(),
    },
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Twilio Verify send error ${resp.status}: ${text}`);
  }

  return to; // return normalised number so the route can echo it
}

/**
 * Check a Verify code. Returns true if correct, false if wrong/expired.
 * Throws on unexpected API errors.
 */
export async function checkVerification(
  phone: string,
  code: string,
): Promise<{ valid: boolean; status: string }> {
  const sid = getServiceSid();
  const to = normalizePhone(phone);

  const resp = await connectors.proxy(
    "twilio",
    `/v2/Services/${sid}/VerificationChecks`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: to, Code: code }).toString(),
    },
  );

  if (!resp.ok) {
    const text = await resp.text();
    // 404 means already verified / expired — treat as invalid rather than error
    if (resp.status === 404) return { valid: false, status: "expired" };
    throw new Error(`Twilio Verify check error ${resp.status}: ${text}`);
  }

  const data = (await resp.json()) as { valid: boolean; status: string };
  return { valid: data.valid, status: data.status };
}
