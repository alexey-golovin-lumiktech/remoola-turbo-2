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
