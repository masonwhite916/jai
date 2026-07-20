// Server-side only — do NOT import in frontend code

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

export async function sendSms(to: string, body: string): Promise<void> {
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!from) throw new Error("TWILIO_FROM_NUMBER env var is not set");

  const accountSid = await getAccountSid();

  // Messaging Service SIDs (MG...) handle international routing automatically
  // and are the correct way to send to countries like Saudi Arabia.
  // Regular phone numbers and alphanumeric IDs go in the From field.
  const params = from.startsWith("MG")
    ? { MessagingServiceSid: from, To: to, Body: body }
    : { From: from, To: to, Body: body };

  const resp = await connectors.proxy(
    "twilio",
    `/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
    },
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Twilio SMS error ${resp.status}: ${text}`);
  }
}
