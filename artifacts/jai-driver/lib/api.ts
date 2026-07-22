import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Base URL for the JAI API server.
 *
 * - On web the app is always served from the same origin that proxies
 *   /api/* to the API server (Expo dev domain in dev, deployment domain
 *   in production), so the page origin is the correct base.
 * - On native we use the host injected by app.config.js.
 */
export function getApiBaseUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  const host =
    (Constants.expoConfig?.extra as Record<string, string> | undefined)
      ?.apiHost ?? 'localhost';
  return `https://${host}`;
}

// ── Module-level auth token ───────────────────────────────────────────────────
// Set once by DriverContext after loading from AsyncStorage; cleared on logout.

let _authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  _authToken = token;
}

export function getAuthToken(): string | null {
  return _authToken;
}

// ── Generic fetch helper ──────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Extract the `error` field from a JSON error body, else return raw text. */
function parseErrorBody(text: string): string {
  try {
    const parsed = JSON.parse(text) as { error?: string };
    if (parsed && typeof parsed.error === 'string') return parsed.error;
  } catch {
    /* not JSON */
  }
  return text;
}

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
    throw new ApiError(resp.status, parseErrorBody(text));
  }
  return resp.json() as Promise<T>;
}
