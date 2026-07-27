/**
 * Minimal Moyasar REST client.
 * Docs: https://docs.moyasar.com/api
 *
 * Required env var: MOYASAR_SECRET_KEY
 */

const MOYASAR_BASE = "https://api.moyasar.com/v1";

function authHeader() {
  const key = process.env.MOYASAR_SECRET_KEY ?? "";
  if (!key) throw new Error("MOYASAR_SECRET_KEY is not set");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

export async function moyasarFetch<T = unknown>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${MOYASAR_BASE}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (json as any)?.message ??
      (json as any)?.error ??
      `Moyasar returned ${res.status}`;
    throw new Error(msg as string);
  }
  return json as T;
}
