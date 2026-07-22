---
name: Next.js migration in pnpm monorepo with Expo
description: Lessons from migrating a Vite React SPA to Next.js App Router inside a pnpm monorepo that also contains Expo apps.
---

## Rule
When migrating a Vite SPA to Next.js in a monorepo that includes Expo, apply all five fixes below or the dev environment will break.

**Why:** Each gotcha either crashes the server (localStorage SSR), breaks images (basePath), crashes jai-app (Metro watcher), or prevents CSS (Tailwind v4 PostCSS).

**How to apply:** Check all five whenever setting up Next.js in this workspace.

---

## 1. basePath does NOT auto-prefix plain `<img>` src
In Next.js, `basePath` is only applied automatically by `<Link>` and `next/image`.
Regular `<img src="/logo.png">` will request at origin root, NOT `/{basePath}/logo.png`.

**Fix:** Either use `next/image`, or hardcode the full path: `<img src="/jai-web/logo.png">`.

## 2. `localStorage` in `useState` initializer crashes SSR (hydration mismatch)
Even a `typeof window` guard in the initializer causes a hydration mismatch: server renders the fallback but the client immediately gets the real value, so the trees differ and React throws.

```tsx
// WRONG — causes hydration mismatch even with the guard
const [lang, setLang] = useState(() => {
  if (typeof window === 'undefined') return 'default';
  return localStorage.getItem('key') ?? 'default';
});

// RIGHT — always start with the server-safe default; apply stored value after mount
const [lang, setLang] = useState<Lang>('default');
useEffect(() => {
  const stored = localStorage.getItem('key') as Lang | null;
  if (stored && stored !== lang) setLang(stored);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

## 3. Metro (Expo) crashes watching Next.js temp directories
Next.js creates `next_tmp_*` directories during compilation; Metro tries to watch them and crashes with ENOENT when they are deleted.

**Fix:** Add to `artifacts/jai-app/metro.config.js`:
```js
config.resolver.blockList = [
  /node_modules\/\.pnpm\/next@.*/,
  /.*\/next_tmp_.*/,
  /.*\/\.next\/.*/,
];
```

## 4. Tailwind v4 PostCSS config for Next.js
Replace `@tailwindcss/vite` with `@tailwindcss/postcss` and create:
```js
// postcss.config.mjs
export default { plugins: { '@tailwindcss/postcss': {} } };
```

## 5. `allowedDevOrigins` for Replit preview
Next.js blocks cross-origin requests from Replit's proxy iframe in dev mode.
```ts
// next.config.ts
allowedDevOrigins: ['*.replit.dev', '*.sisko.replit.dev', '*.replit.app', '*'],
```

## 6. `"use client"` strategy
- All context providers using hooks → `"use client"` at file top
- All components using framer-motion, useState, useEffect, useContext → `"use client"`
- Page-level components that just compose client components → can stay as server components
- The `app/providers.tsx` pattern: one client wrapper for QueryClient + contexts + Toaster
