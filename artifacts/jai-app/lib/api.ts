import Constants from 'expo-constants';

/**
 * Base URL for the JAI API server.
 * In Replit's Expo environment the API server shares the same domain,
 * accessed via the /api path prefix.
 */
export function getApiBaseUrl(): string {
  const host =
    (Constants.expoConfig?.extra as Record<string, string> | undefined)
      ?.apiHost ?? 'localhost';
  return `https://${host}`;
}

// ── Module-level auth token ───────────────────────────────────────────────────
// Set once by AppContext after loading from AsyncStorage; cleared on logout.

let _authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  _authToken = token;
}

export function getAuthToken(): string | null {
  return _authToken;
}

// ── Generic fetch helper ──────────────────────────────────────────────────────

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { skipAuth?: boolean },
): Promise<T> {
  const base = getApiBaseUrl();
  const url  = `${base}${path}`;

  const headers = new Headers(options?.headers as HeadersInit | undefined);
  if (!headers.has('Content-Type') && options?.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (_authToken && !options?.skipAuth) {
    headers.set('Authorization', `Bearer ${_authToken}`);
  }

  const resp = await fetch(url, { ...options, headers });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API ${resp.status}: ${text}`);
  }
  return resp.json() as Promise<T>;
}
