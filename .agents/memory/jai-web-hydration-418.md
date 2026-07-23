---
name: React #418 in preview for SSR-hydrating artifacts
description: Why Minified React error #418 (HTML mismatch) appears in the workspace preview console for jai-web but not in a clean browser
---

**Rule:** React error #418 (`args[]=HTML`) reported in the workspace preview's browser-console logs for the Next.js static-export artifact (`jai-web`) is environmental, not an app bug. Do not chase app-side fixes for it.

**Why:** Verified July 2026 with two decisive checks:
1. The HTML served through the preview proxy is byte-identical to the build output on disk (`curl` + `diff`, both through port 80 and direct to the dev server) — no server-side injection.
2. A clean Playwright browser (testing subagent) loading the same URL captured **zero** console errors, warnings, and page errors — no #418.
So the mismatch is created client-side by the preview pane's same-origin instrumentation (console-log capture etc.) mutating the document around hydration. Only artifacts that hydrate a full server-rendered document are susceptible; the CSR artifacts (Vite admin, Expo apps) render into an empty root and never hydrate `<html>`.

**How to apply:**
- When the platform flags a "crash" that is only a #418 in preview console logs and the page renders fine, verify with a clean-browser load (testing subagent with console listeners) before touching code.
- The error is recoverable (React regenerates the tree client-side); the page works. It will not occur in production, which is served without preview instrumentation.
- Still keep the app hygiene that was added during the investigation: no pre-hydration writes to `document.documentElement` or `document.head`; DOM writes go to `document.body` behind a mounted guard; `suppressHydrationWarning` on `<html>`/`<body>`.
