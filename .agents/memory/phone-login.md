---
name: Phone-only login
description: OTP and Taqnyat fully removed; login is phone-only via POST /api/auth/login
---

# Phone-only login

## Rule
Login is phone-only — no OTP, no SMS, no verification step. The canonical endpoint is `POST /api/auth/login` with `{ phone, name?, invite_code?, device_name?, platform? }`.

**Why:** User explicitly removed OTP/Taqnyat. The Taqnyat IP whitelist was blocking the Railway server, and OTP was already bypassed server-side anyway.

## How to apply
- Any new auth-adjacent feature should use `/api/auth/login`, not the legacy aliases.
- `/api/auth/send-otp` and `/api/auth/verify-otp` are kept as no-op backward-compat aliases (they call `phoneLogin` internally); do not add new clients against them.
- `TAQNYAT_BEARER_TOKEN` secret has been deleted. Do not reference it.
- `artifacts/jai-driver` is abandoned — it still shows OTP UI but must never be edited.
