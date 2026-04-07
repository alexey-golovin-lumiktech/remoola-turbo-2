export const APP_SCOPE = `consumer` as const;

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
 * Uses only trusted config (never the Host header) to avoid SSRF/cookie leakage.
 * In production, fail fast unless a canonical app origin is configured explicitly.
 */
export function getRequestOrigin(): string {
  const configuredOrigin =
    normalizeOriginCandidate(process.env.CONSUMER_APP_ORIGIN) ??
    normalizeOriginCandidate(process.env.NEXT_PUBLIC_APP_ORIGIN);

  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (process.env.NODE_ENV !== `production`) {
    return `http://localhost:3001`;
  }

  throw new Error(`Consumer app origin is not configured`);
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
