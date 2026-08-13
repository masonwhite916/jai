/**
 * Loaded via `--import ./src/test/promo-hooks.mjs` before the promo-enforcement test suite.
 * Registers the loader that intercepts @workspace/db, Moyasar client, and requireAuth.
 */
import { register } from "node:module";
register("./promo-loader.mjs", import.meta.url);
