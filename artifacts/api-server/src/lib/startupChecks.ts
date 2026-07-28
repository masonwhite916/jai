import { logger } from "./logger";

/**
 * Log a structured WARNING for each optional service whose credentials are
 * missing at startup. This makes misconfigured Railway (or any host) deploys
 * immediately visible in the structured log stream without preventing the
 * server from starting.
 */
export function runStartupChecks(): void {
  // ── OpenAI / AI chat ────────────────────────────────────────────────────────
  const hasOpenAI =
    !!process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] ||
    !!process.env["OPENAI_API_KEY"];

  if (!hasOpenAI) {
    logger.warn(
      {
        service: "openai",
        missingEnvVars: ["AI_INTEGRATIONS_OPENAI_API_KEY", "OPENAI_API_KEY"],
      },
      "STARTUP WARNING: Neither AI_INTEGRATIONS_OPENAI_API_KEY nor OPENAI_API_KEY is set — AI chat (/api/ai/chat) will return 502 for every request",
    );
  }

  // ── Taqnyat / OTP ──────────────────────────────────────────────────────────
  const hasTaqnyat = !!process.env["TAQNYAT_BEARER_TOKEN"];

  if (!hasTaqnyat) {
    logger.warn(
      {
        service: "taqnyat",
        missingEnvVars: ["TAQNYAT_BEARER_TOKEN"],
      },
      "STARTUP WARNING: TAQNYAT_BEARER_TOKEN is not set — OTP send will fail for real phone numbers (test bypass with TEST_PHONE_NUMBER still works)",
    );
  }
}
