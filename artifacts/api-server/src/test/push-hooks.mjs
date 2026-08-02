/**
 * Loaded via `--import ./src/test/push-hooks.mjs` before the push-notification test suite.
 * Registers the loader that intercepts @workspace/db.
 */
import { register } from "node:module";
register("./push-loader.mjs", import.meta.url);
