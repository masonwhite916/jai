import Constants from 'expo-constants';

/**
 * Base URL for the JAI API server.
 *
 * In Replit's Expo environment, the API server runs on the same shared
 * domain as the Expo app, under the /api path.
 * We read the host from expo-constants (injected via app.config.js extra)
 * and fall back to localhost for local dev.
 */
export function getApiBaseUrl(): string {
  const host =
    (Constants.expoConfig?.extra as Record<string, string> | undefined)
      ?.apiHost ?? 'localhost';
  return `https://${host}/api`;
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const resp = await fetch(url, options);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API error ${resp.status}: ${text}`);
  }
  return resp.json() as Promise<T>;
}
