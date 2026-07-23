---
name: Testing subagent cannot verify hover/active styles
description: Why hover and press color checks fail in the Playwright tester even when the CSS is correct
---

**Rule:** The Playwright testing subagent's browser reports `(hover: hover) = false` / `(hover: none) = true`. Tailwind v4 wraps every `hover:` utility in `@media (hover: hover)`, so hover styles never apply in that environment — a tester report of "hover color doesn't change" is NOT evidence of a bug. Emulated-touch browsers are similarly unreliable for `:active` timing.

**Why:** Verified July 2026 on the jai-web footer links: the rule `.hover\:text-\[\#C21875\]:hover` was present in the built CSS inside `@media (hover:hover){...}`, the tester confirmed `:hover` matched but the color stayed inherited, and `matchMedia('(hover: hover)')` returned false in its browser.

**How to apply:**
- Verify hover/press styling by grepping the emitted CSS (e.g. `out/_next/static/css/*.css` for Next.js static export) for the expected selector and checking its enclosing block, not by asking the tester to measure computed colors.
- Use the tester for behavior (navigation, scroll, layout, console errors), which it measures reliably — e.g. smooth-scroll targets can be polled every 500ms until the rect settles.
- When grepping escaped Tailwind selectors, use `grep -F` (fixed string); unescaped `[` in a regex silently becomes a character class and reports false negatives.
