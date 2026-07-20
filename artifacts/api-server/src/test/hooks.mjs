/**
 * Loaded via `tsx --import ./src/test/hooks.mjs` before the test suite runs.
 *
 * tsx is the runner (handles TypeScript transpilation automatically).
 * This file only needs to register the DB mock loader so "@workspace/db" is
 * intercepted before dispatch.ts opens a real Postgres connection.
 */
import { register } from "node:module";

register("./loader.mjs", import.meta.url);
