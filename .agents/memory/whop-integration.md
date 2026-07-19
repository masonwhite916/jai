---
name: Whop payment integration
description: Whop plan IDs, products, and checkout flow for JAI membership plans
---

## Company & Plan IDs (stored in shared env vars)
- `WHOP_COMPANY_ID` = biz_OZR80ib6g8K3LY
- `WHOP_PLAN_BASIC` = plan_gK0TcuyckVn6X  (prod_1masgdEUXUA7y — JAI Basic, $199/yr)
- `WHOP_PLAN_ACCIDENTS` = plan_HtcnYTclKSeK2  (prod_ytGzk7L8Q1jj1 — JAI Accidents, $299/yr)
- `WHOP_PLAN_RENTAL` = plan_ZdaSBn6h2C7tn  (prod_qTDUpeBjc9zMl — JAI Rental, $600/yr)

## Checkout flow
1. Frontend `POST /api/whop/checkout` with `{ plan, redirect_url, ...subscriber metadata }`
2. API server maps plan slug → plan_id, calls Whop `POST /api/v1/checkout_configurations`
3. Returns `{ purchase_url, checkout_id }` — frontend redirects to `purchase_url`
4. After payment Whop redirects user to `/payment-success`

## Key lessons
- `create_plan` requires `renewal_price` (not `initial_price`) for recurring plans; `initial_price` is an upfront surcharge ON TOP of the first renewal
- `billing_period` is in days — use 365 for annual
- Whop proxy: `https://${REPLIT_CONNECTORS_HOSTNAME}/api/v2/proxy/api/v1/...` with `Connector-Name: whop` header
- Helper scripts `whop-mcp.mjs` and `whop-api.mjs` are in the project root
- Server-side Whop client: `artifacts/api-server/src/lib/whopClient.ts`
- Checkout route: `artifacts/api-server/src/routes/whop.ts` → mounted at `/api/whop/checkout`

**Why:** Prices are in USD (SAR values used numerically for MVP — 199/299/600 USD). Exchange rate conversion is a future task.
