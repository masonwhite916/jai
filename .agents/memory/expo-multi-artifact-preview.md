---
name: Expo multi-artifact dev preview
description: How the single Expo dev domain picks which mobile artifact to serve, and how to switch it
---

# Expo dev domain routing with two mobile artifacts

The repl has ONE `$REPLIT_EXPO_DEV_DOMAIN`. When two Expo artifacts both declare `router = "expo-domain"` in their artifact.toml, the domain serves only one of them — and NOT necessarily the one with `previewPath "/"`. `paths`, restart order, and no-op toml re-applies do NOT change the winner.

**The rule:** the expo domain binds to an artifact claiming `router = "expo-domain"`. To review a different mobile artifact, make it the ONLY claimant:

1. Set the other mobile artifact's toml to `router = "path"` (web artifacts use this value) via `verifyAndReplaceArtifactToml`.
2. Keep/put `router = "expo-domain"` on the app you want to preview.
3. No workflow restart needed — the flip takes effect within seconds.

**How to verify which app the domain serves** (bundle contents can mislead): drop a probe file in `<artifact>/public/probe.txt`, then `curl https://$REPLIT_EXPO_DEV_DOMAIN/probe.txt` — Metro serves `public/` at root. Or check `<title>` of the domain's index HTML (comes from app.json name).

**Why:** hit this while reviewing jai-driver (July 2026) — domain kept serving jai-app despite jai-driver owning previewPath "/", restarts, and toml re-applies. Only switching jai-app to `router = "path"` flipped the domain.

**How to apply:** whenever the user needs to preview the OTHER mobile app, swap which artifact holds `router = "expo-domain"` (and tell the user the non-domain app's dev preview is degraded until swapped back). The app on `router = "path"` still runs; its Metro just isn't reachable at the expo domain.

Side note: local port 8081 is held by workspace tooling (redirects to /__mockup) — it is unrelated to expo routing.
