# JAI Roadside Assistance

Roadside assistance platform for Saudi Arabia: customers request help (tow, battery, tire, fuel, lockout, mechanic, electric), technicians accept and work jobs, dispatchers track everything live.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- `TECHNICIAN_INVITE_CODE` (shared env var) — invite code gating technician signup; fail-closed (unset = technician signup disabled). Current value shared with the user in chat.

## Where things live

- `artifacts/api-server` — Express 5 API + WebSocket dispatch (`/api/ws`); routes in `src/routes/`, WS rooms/relay in `src/lib/dispatch.ts`
- `artifacts/jai-app` — customer mobile app (Expo)
- `artifacts/jai-driver` — technician mobile app (Expo); real backend integration via `lib/api.ts`, `lib/socket.ts`, `context/DriverContext.tsx`
- `artifacts/jai-admin` — dispatch panel (React + Vite)
- `artifacts/jai-web` — marketing website (Next.js)
- `artifacts/jai-deck` — client pitch deck (slides)
- DB schema: `lib/db` (Drizzle); API contracts: `lib/api-spec/openapi.yaml`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + ws
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Mobile: Expo (SDK 54) + expo-router
- SMS OTP: Taqnyat (Twilio-compatible wrapper in `api-server/src/lib/taqnyatClient.ts`)
- Payments: Whop (subscriptions)

## Architecture decisions

- One shared API server for all artifacts; clients reach it at `/api` via the shared proxy (web: `window.location.origin`; native: `Constants.expoConfig.extra.apiHost` injected by each app's `app.config.js`)
- Auth is phone OTP → opaque bearer token stored per-app in AsyncStorage; roles: customer / technician / admin. Technician role granted ONLY at signup with valid `TECHNICIAN_INVITE_CODE`; existing users' roles never change via OTP flow
- Job status flow enforced server-side: pending → accepted → en_route → arrived → working → completed (cancelled from any active state); PATCH returns bare job row; accept conflicts → 409 (race) or 422 (already past pending)
- Realtime: WS rooms — `technicians` (new_job broadcasts), `job:{id}` (status + tech location relay), admin room for dispatch panel
- Driver app computes distance/ETA client-side (haversine, ~2 min/km) because the server doesn't fill `distance_km`/`eta_min`
- Both mobile apps are RTL-aware with en/ar i18n dictionaries in each app's `context/LanguageContext.tsx`

## Product

- Customer app: request help, live technician tracking, membership subscriptions (Whop)
- Technician app: OTP sign-in with invite code, live job board, accept/work jobs with status flow, GPS streaming during active job, earnings summary
- Dispatch panel: live map of jobs and technician locations, job management
- Website: marketing + service info; deck: client presentation

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Only one Expo artifact can own the expo dev domain (`router = "expo-domain"` in artifact.toml); the other mobile app's dev preview is degraded until swapped back (see agent memory: expo-multi-artifact-preview)
- Expo dev server can serve a stale bundle after edits — restart the Expo workflow before judging changes
- OTP sends real SMS via Taqnyat — no dev bypass; for API-level testing seed users with tokens directly in the dev DB
- `Alert.alert` is a no-op on RN-web — use each app's `lib/ui.ts` `notify`/`confirmAsync` helpers

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
