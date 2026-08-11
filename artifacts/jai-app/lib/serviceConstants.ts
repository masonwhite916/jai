/**
 * Canonical service price table (SAR).
 *
 * These values MUST stay in sync with:
 *   - PAYOUTS in artifacts/api-server/src/routes/requests.ts
 *   - SERVICE_AMOUNTS in artifacts/api-server/src/routes/moyasar.ts
 *   - SERVICE_INFO.basePrice in artifacts/jai-app/app/request/[service].tsx
 *
 * The server is the authoritative source; the app uses these only as a
 * display fallback when the job record has not been returned yet.
 */
export const SERVICE_PAYOUTS: Record<string, number> = {
  battery: 120,
  fuel:     80,
  tire:    350,
  tow:     500,
  lockout: 200,
  mechanic: 300,
  electric: 280,
};
