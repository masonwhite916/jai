---
name: Admin panel uses Railway backend
description: jai-admin talks to an external Railway API server, not the local api-server artifact
---

The user's APK and the jai-admin panel both point at an external Railway deployment (`workspaceapi-server-production-9836.up.railway.app`, set in `artifacts/jai-admin/src/config.ts` via `setBaseUrl` + WS URL).

**Why:** The APK was built against Railway; the user chose (Aug 14, 2026) to point the admin panel there too so both share one database.

**How to apply:**
- The local `artifacts/api-server` workflow and Replit DB are NOT what the admin panel reads — don't debug admin data issues against local workflow logs or the Replit database.
- Railway runs the same codebase but its DB state is separate; query it via the admin REST API with a token from `POST /api/admin/login` (ADMIN_PASSWORD works there).
- Any server-side change (routes, WS events) only reaches the admin panel after the user redeploys the api-server to Railway.
