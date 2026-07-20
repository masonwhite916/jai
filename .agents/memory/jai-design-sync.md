---
name: JAI design sync
description: The JAI product suite (customer app, driver app, website, deck) should share brand tokens and i18n structure.
---

The JAI customer app and the new driver app share the same brand palette (indigo `#2D1B69` to magenta `#C21875`), Inter + Cairo fonts, and English/Arabic RTL language context. When adding new JAI artifacts or iterating on existing ones, keep colors, typography, and i18n key naming consistent across the suite so product surfaces feel like one brand.

**Why:** Inconsistent styling and separate translation dictionaries increase maintenance cost and fragment the user experience.
**How to apply:** Reuse `constants/colors.ts`, the `LanguageContext` pattern, and the Inter/Cairo font loading pattern from `jai-app` and `jai-driver` when building future JAI surfaces.
