---
name: Expo multi-artifact dev preview
description: With two Expo artifacts in one repl, only the one whose previewPath is "/" is fully viewable in dev.
---

Metro's dev server always emits root-absolute URLs (`/node_modules/...entry.bundle`, `/assets?...`) and ignores `experiments.baseUrl` in development. Through the path-routed shared proxy, any Expo artifact NOT at previewPath `/` serves its HTML but the browser then pulls the root artifact's JS bundle — the page renders the wrong app or a "screen doesn't exist" route error.

**Why:** Path-prefix routing can't help when the client hardcodes root-absolute URLs; only the artifact owning `/` resolves consistently. The `*.expo.*` dev domain is separate, statically bound to one Metro (used for Expo Go QR), and does not follow previewPath changes.

**How to apply:**
- To review a second Expo app in dev, swap preview slots via `verifyAndReplaceArtifactToml` (write full temp TOML, update `previewPath`, `paths`, `BASE_PATH`), then restart both expo workflows. Production is unaffected — `scripts/build.js` + `server/serve.js` honor BASE_PATH so both apps deploy correctly at their own paths.
- When verifying an Expo web app, HTTP 200 on the HTML is NOT proof it works: fetch the entry bundle through the same route the browser uses and compare its size against the direct port — a size mismatch means the proxy served another app's bundle. Finish with a rendered screenshot (retry once after warm-up; first paint of a dev bundle can be slow and screenshot blank white).
