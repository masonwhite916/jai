---
name: Taqnyat OTP integration
description: Taqnyat Verify API replaces Twilio for OTP — endpoints, codes, and key gotchas
---

# Taqnyat OTP integration

## API
- Base URL: `https://api.taqnyat.sa/verify.php` (single endpoint, POST for both send and check)
- Auth: `Authorization: Bearer <token>` header + `apiKey` in JSON body (both required)
- Send body: `{ apiKey, numbers: ["966XXXXXXXXX"], method: "sms", sender, lang, requestId, returnJson: 1 }`
- Check body: same + `activeKey: "<code>"`

## Result codes
- 5 = sent, 7 = already sent (treat as success), 10 = valid, 11 = wrong code
- 12/8 = attempts exhausted (map to "expired" status), 4 = low balance, 3 = bad number

## requestId strategy
Using the normalized phone digits (e.g. 966501234567) as requestId — deterministic and stateless.
Code 8 (exceeded attempts) requires a different requestId; surfaced as "expired" so user requests a new OTP.

## Secrets / env vars
- `TAQNYAT_BEARER_TOKEN` — Replit Secret
- `TAQNYAT_SENDER` = "Jai" — shared env var
- `TAQNYAT_LANG` = "ar" — shared env var

**Why:** Twilio Verify was too expensive for the target Saudi market. Taqnyat is a local Saudi SMS gateway.

**How to apply:** Implementation is in `artifacts/api-server/src/lib/taqnyatClient.ts`.
Public API (`sendVerification`, `checkVerification`, `normalizePhone`) is identical to the old twilioClient.ts — auth.ts needed only a one-line import change.
