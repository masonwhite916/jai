// Server-side only — do NOT import in frontend code
//
// Taqnyat Verify API — https://api.taqnyat.sa/verify.php
// Both send and check are POST to the same URL.
// Auth: apiKey field in JSON body (+ optional Bearer header).
// Docs: https://dev.taqnyat.sa/en/doc/verify/

const TAQNYAT_VERIFY_URL = "https://api.taqnyat.sa/verify.php";

// Taqnyat result codes (from Error.ErrorCode on failure, status on success)
// Docs: https://dev.taqnyat.sa/en/doc/verify/
const CODE = {
  SENT: 5,             // OTP sent successfully
  RESEND: 7,           // Already sent — treat as success for send
  VALID: 10,           // Code is correct
  INVALID: 11,         // Code is wrong
  EXHAUSTED: 12,       // Too many wrong attempts
  ALREADY_VERIFIED: 13,
  ALREADY_VERIFIED_2: 19,
  BAD_NUMBER: 3,
  LOW_BALANCE: 4,
  EXCEEDED_ATTEMPTS: 8,
  SENDER_ERROR: 6,     // Sender name not activated or unknown error
} as const;

function getApiKey(): string {
  const key = process.env.TAQNYAT_BEARER_TOKEN;
  if (!key) throw new Error("TAQNYAT_BEARER_TOKEN env var is not set");
  return key;
}

function getSender(): string {
  return process.env.TAQNYAT_SENDER ?? "JAI";
}

function getLang(): string {
  return process.env.TAQNYAT_LANG ?? "ar";
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("966")) return `+966${digits.slice(3)}`;
  if (digits.startsWith("0")) return `+966${digits.slice(1)}`;
  return `+966${digits}`;
}

/** Strip leading + for Taqnyat (expects numbers without +) */
function toTaqnyatNumber(e164: string): string {
  return e164.replace(/^\+/, "");
}

/**
 * We use the normalised phone digits as the requestId.
 * This is deterministic and stateless — the same requestId is used
 * during both send and check without any server-side storage.
 */
function requestIdFor(e164: string): string {
  return e164.replace(/\D/g, "");
}

// Actual Taqnyat response shape:
// Success: { status: 5|10|..., ResponseStatus: "success", Data: {...}, Error: null }
// Failure: { status: 1,        ResponseStatus: "fail",    Data: null,  Error: { ErrorCode: 6, MessageEn: "..." } }
type TaqnyatResponse = {
  status: number;
  ResponseStatus: "success" | "fail";
  Data: unknown;
  Error: { ErrorCode: number; MessageEn?: string; MessageAr?: string } | null;
};

async function verifyPost(body: Record<string, unknown>): Promise<{ code: number; message?: string }> {
  const resp = await fetch(TAQNYAT_VERIFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({ ...body, returnJson: 1 }),
  });

  const text = await resp.text();
  let data: TaqnyatResponse;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Taqnyat returned non-JSON: ${text.slice(0, 200)}`);
  }

  // On failure, the specific error code lives in Error.ErrorCode.
  // On success, the result code is in status (e.g. 5 = sent, 10 = verified).
  if (data.ResponseStatus === "fail" && data.Error?.ErrorCode) {
    return { code: data.Error.ErrorCode, message: data.Error.MessageEn };
  }
  return { code: data.status, message: undefined };
}

/**
 * Send an OTP via Taqnyat Verify.
 * Returns the normalised E.164 phone number.
 */
export async function sendVerification(phone: string): Promise<string> {
  const e164 = normalizePhone(phone);

  const { code, message } = await verifyPost({
    apiKey:    getApiKey(),
    numbers:   [toTaqnyatNumber(e164)],
    method:    "sms",
    sender:    getSender(),
    lang:      getLang(),
    requestId: requestIdFor(e164),
  });

  if (code === CODE.SENT || code === CODE.RESEND) return e164;

  if (code === CODE.BAD_NUMBER)    throw new Error("Taqnyat: mobile number not recognised");
  if (code === CODE.LOW_BALANCE)   throw new Error("Taqnyat: account balance too low to send OTP");
  if (code === CODE.SENDER_ERROR)  throw new Error("Taqnyat: sender name not activated — check TAQNYAT_SENDER env var");
  throw new Error(`Taqnyat send error (code ${code}): ${message ?? "unknown"}`);
}

/**
 * Verify an OTP. Returns { valid, status } in the same shape as the
 * old Twilio client so auth.ts needs no changes.
 */
export async function checkVerification(
  phone: string,
  activeKey: string,
): Promise<{ valid: boolean; status: string }> {
  const e164 = normalizePhone(phone);

  const { code, message } = await verifyPost({
    apiKey:    getApiKey(),
    numbers:   [toTaqnyatNumber(e164)],
    method:    "sms",
    sender:    getSender(),
    lang:      getLang(),
    requestId: requestIdFor(e164),
    activeKey,
  });

  if (code === CODE.VALID || code === CODE.ALREADY_VERIFIED || code === CODE.ALREADY_VERIFIED_2) {
    return { valid: true, status: "approved" };
  }
  if (code === CODE.INVALID)          return { valid: false, status: "incorrect" };
  if (code === CODE.EXHAUSTED)        return { valid: false, status: "expired" };
  if (code === CODE.EXCEEDED_ATTEMPTS) return { valid: false, status: "expired" };

  throw new Error(`Taqnyat check error (code ${code}): ${message ?? "unknown"}`);
}
