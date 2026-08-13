---
name: EAS build phantom dependency failures
description: Why EAS Android builds fail with "Cannot find module" for packages that work locally in the pnpm monorepo
---

# EAS builds break on undeclared (phantom) dependencies

**Rule:** Any module referenced by name in `babel.config.js`, `metro.config.js`, or app code of an Expo artifact must be a *declared* dependency in that artifact's own `package.json` — even if it resolves fine locally through the pnpm store.

**Why:** EAS first runs `pnpm install --frozen-lockfile`, but after prebuild it re-runs `pnpm install --no-frozen-lockfile`, which re-resolves and can change store layout/hoisting (remote logs even showed different react-native peer suffixes than local). Phantom deps that resolved locally by luck then fail, e.g. `Failed to construct transformer: Error: Cannot find module 'babel-preset-expo'` in `:app:createBundleReleaseJsAndAssets` (node exit 1, reported only as "Gradle build failed with unknown error").

**How to apply:**
- Fix: `pnpm add -D babel-preset-expo@<matching expo SDK version>` in the artifact (done for jai-app).
- Debugging EAS failures: pasted Gradle tails are useless — fetch real logs via `eas build:list --json --non-interactive` → `logFiles[0]` URL → NDJSON, filter `msg` fields. The bundling error lives in the RUN_GRADLEW phase messages.
- Verify locally with `NODE_ENV=production expo export --platform android`, but remember local success does NOT prove EAS success when phantom deps are involved.
