/**
 * Loaded via `--import ./src/test/jobs-hooks.mjs` before the jobs-completion test suite.
 * Registers the loader that intercepts @workspace/db, requireAuth, dispatch, and pushNotifications.
 */
import { register } from "node:module";
register("./jobs-loader.mjs", import.meta.url);
