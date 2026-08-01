/**
 * Loaded via `--import ./src/test/payment-hooks.mjs` before the payment-gate test suite.
 * Registers the extended loader that intercepts @workspace/db AND the Moyasar client.
 */
import { register } from "node:module";
register("./payment-loader.mjs", import.meta.url);
