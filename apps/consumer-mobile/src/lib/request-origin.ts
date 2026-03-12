/**
 * Server-only: returns the request origin (base URL) for same-origin fetches.
 * Use from server actions or route handlers when forwarding requests to this app's API.
 * Uses only trusted config (never the Host header) to avoid SSRF/cookie leakage.
 *
 * Resolution order:
 * 1. VERCEL_URL (https) when set
 * 2. Fallback http://localhost:3002 (consumer-mobile dev port; keep in sync with test-constants.ts and package.json "dev" script)
 */
export function getRequestOrigin(): string {
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }
  return `http://localhost:3002`;
}

/**
 * Server-only: returns headers needed to bypass Vercel Deployment Protection
 * for internal server-to-server fetches within the same deployment.
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
