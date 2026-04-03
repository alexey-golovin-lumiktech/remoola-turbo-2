const VERCEL_PROJECT_PRODUCTION_URL_ENV = `VERCEL_PROJECT_PRODUCTION_URL`;

function normalizeOriginCandidate(candidate: string | undefined): string | null {
  if (!candidate) return null;

  const normalizedCandidate = candidate.includes(`://`) ? candidate : `https://${candidate}`;
  try {
    return new URL(normalizedCandidate).origin;
  } catch {
    return null;
  }
}

/**
 * Server-only: returns the request origin (base URL) for same-origin fetches.
 * Use from server actions or route handlers when forwarding requests to this app's API.
 * Uses only trusted config (never the Host header) to avoid SSRF/cookie leakage.
 *
 * Resolution order:
 * 1. Explicit app envs
 * 2. Vercel project production domain
 * 3. Local dev fallback
 */
export function getRequestOrigin(): string {
  const configuredOrigin =
    normalizeOriginCandidate(process.env.CONSUMER_APP_ORIGIN) ??
    normalizeOriginCandidate(process.env.NEXT_PUBLIC_APP_ORIGIN) ??
    normalizeOriginCandidate(process.env[VERCEL_PROJECT_PRODUCTION_URL_ENV]);

  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (process.env.NODE_ENV !== `production`) {
    return `http://localhost:3002`;
  }

  throw new Error(`Consumer mobile app origin is not configured`);
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
