// Server-side only — do NOT import in frontend code

export async function whopFetch(
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const token = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !token) {
    throw new Error(
      'Missing Replit connector environment variables. ' +
        'Ensure the Whop integration is connected.',
    );
  }

  const resp = await fetch(`https://${hostname}/api/v2/proxy${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Replit-Token': token,
      'Connector-Name': 'whop',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Whop API error ${resp.status}: ${text}`);
  }

  return resp.json();
}
