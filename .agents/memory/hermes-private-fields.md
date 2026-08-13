---
name: Hermes private class fields build failure
description: Android release build fails with "private properties are not supported" in hermes-compiler@0.14.1 due to react-native@0.83+ shipping src/private/ files with ES2022 #field syntax.
---

## The rule
`babel.config.js` must set `unstable_transformProfile: 'hermes-v0'` in `babel-preset-expo` options to force private class field compilation before hermesc runs.

**Why:** react-native@0.83+ ships `src/private/webapis/geometry/DOMRect*.js` (and ~10 other files) with native `#field` syntax. `babel-preset-expo` defaults to the `hermes-stable` profile when `engine === 'hermes'`, which skips the `@babel/plugin-transform-class-properties` transform on the assumption that Hermes handles private fields natively. But `hermes-compiler@0.14.1` (bundled with Expo SDK 57) does NOT support private fields — so the Gradle task `createBundleReleaseJsAndAssets` fails with "private properties are not supported" / hermesc exit code 2.

**How to apply:** In `artifacts/jai-app/babel.config.js`, keep the preset as:
```js
['babel-preset-expo', { unstable_transformImportMeta: true, unstable_transformProfile: 'hermes-v0' }]
```
- `hermes-v0` forces class property transforms on all files (including node_modules via the `extends` mechanism).
- Bundle size increases slightly (~1MB) because compiled class properties are larger than native syntax.
- Do NOT use `overrides` with `test` regex — this causes `getCacheKey` to crash with "Cannot read properties of undefined (reading 'transformFile')".
- Do NOT use `transformIgnorePatterns` in `metro.config.js` — Expo's custom transform worker ignores that key entirely.

## Symptoms
- `createBundleReleaseJsAndAssets` fails; hermesc exits with code 2
- Error shows `#x; #y; #width; #height` private fields at line ~3752 in the bundle
- `expo export --dev false` succeeds (produces JS, no HBC step) — dev server also fine
- Only Android release / EAS builds are affected

## How it was diagnosed
- Ran `expo export --dev false --output-dir /tmp/...` to get the pre-Hermes JS bundle
- Grepped the bundle for `^\s*#[a-zA-Z]` — found 149 lines
- Traced them to `react-native/src/private/webapis/geometry/DOMRectReadOnly.js` via module wrapper `__d(...)` comments
- Confirmed `babel-preset-expo` index.js line 55: `unstable_transformProfile = engine === 'hermes' ? 'hermes-stable' : 'default'`
- `hermes-stable` → `hermes-v1` config → skips class-properties transform
