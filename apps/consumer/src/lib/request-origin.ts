/**
 * Server-only: returns the request origin (base URL) for same-origin fetches.
 * Uses only trusted config (never the Host header) to avoid SSRF/cookie leakage.
 */
export function getRequestOrigin(): string {
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }
  return `http://localhost:3001`;
}

/**
 * Server-only: returns headers needed to bypass Vercel Deployment Protection
 * when the BFF proxies requests to the backend API.
 * When VERCEL_AUTOMATION_BYPASS_SECRET is set, adds the x-vercel-protection-bypass header.
 * Returns an empty object in local dev (no-op).
 */
export function getBypassHeaders(): Record<string, string> {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (secret) {
    return { 'x-vercel-protection-bypass': secret };
  }
  return {};
}
