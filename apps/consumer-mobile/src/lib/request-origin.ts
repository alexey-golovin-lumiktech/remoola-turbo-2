export const APP_SCOPE = `consumer-mobile` as const;

function normalizeOriginCandidate(candidate: string | undefined): string | null {
  if (!candidate) return null;
  const trimmed = candidate.trim();
  if (!trimmed || trimmed === `undefined` || trimmed === `null`) return null;

  const normalizedCandidate = trimmed.includes(`://`) ? trimmed : `https://${trimmed}`;
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
 * In production, fail fast unless a canonical mobile app origin is configured explicitly.
 */
export function getRequestOrigin(): string {
  const configuredOrigin =
    normalizeOriginCandidate(process.env.CONSUMER_MOBILE_APP_ORIGIN) ??
    normalizeOriginCandidate(process.env.NEXT_PUBLIC_APP_ORIGIN);

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
