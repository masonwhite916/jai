// Server-side only — do NOT import in frontend code
//
// Twilio Verify lives at verify.twilio.com, a separate host from api.twilio.com.
// The Replit connector only proxies to api.twilio.com, so we call Verify directly
// using Basic auth (AccountSid:AuthToken). The Account SID is fetched via the
// connector; the Auth Token comes from the TWILIO_AUTH_TOKEN secret.

import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();

// Cache the account SID so we only fetch it once per server start
let _accountSid: string | null = null;

async function getAccountSid(): Promise<string> {
  if (_accountSid) return _accountSid;
  const resp = await connectors.proxy("twilio", "/2010-04-01/Accounts.json", {
    method: "GET",
  });
  if (!resp.ok) {
    throw new Error(`Twilio: could not fetch account SID (${resp.status})`);
  }
  const data = (await resp.json()) as {
    accounts?: Array<{ sid: string }>;
  };
  const sid = data.accounts?.[0]?.sid;
  if (!sid) throw new Error("Twilio: no account found");
  _accountSid = sid;
  return sid;
}

function getAuthToken(): string {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) throw new Error("TWILIO_AUTH_TOKEN env var is not set");
  return token;
}

function getServiceSid(): string {
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid) throw new Error("TWILIO_VERIFY_SERVICE_SID env var is not set");
  return sid;
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("966")) return `+${digits}`;
  if (digits.startsWith("0")) return `+966${digits.slice(1)}`;
  return `+966${digits}`;
}

async function verifyFetch(
  path: string,
  body: Record<string, string>,
): Promise<Response> {
  const accountSid = await getAccountSid();
  const authToken = getAuthToken();
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  return fetch(`https://verify.twilio.com${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams(body).toString(),
  });
}

/**
 * Send a WhatsApp OTP via Twilio Verify.
 * Returns the normalised E.164 phone number.
 */
export async function sendVerification(phone: string): Promise<string> {
  const serviceSid = getServiceSid();
  const to = normalizePhone(phone);

  const resp = await verifyFetch(
    `/v2/Services/${serviceSid}/Verifications`,
    { To: to, Channel: "whatsapp" },
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Twilio Verify send error ${resp.status}: ${text}`);
  }

  return to;
}

/**
 * Check a Verify code. Returns { valid, status }.
 * A 404 means the code has already been used or expired.
 */
export async function checkVerification(
  phone: string,
  code: string,
): Promise<{ valid: boolean; status: string }> {
  const serviceSid = getServiceSid();
  const to = normalizePhone(phone);

  const resp = await verifyFetch(
    `/v2/Services/${serviceSid}/VerificationChecks`,
    { To: to, Code: code },
  );

  if (resp.status === 404) return { valid: false, status: "expired" };

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Twilio Verify check error ${resp.status}: ${text}`);
  }

  const data = (await resp.json()) as { valid: boolean; status: string };
  return { valid: data.valid, status: data.status };
}
