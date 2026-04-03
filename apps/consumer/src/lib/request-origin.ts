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
 * Uses only trusted config (never the Host header) to avoid SSRF/cookie leakage.
 * In production on Vercel, prefer the project production domain over deployment URLs
 * so backend CORS and scope resolution stay aligned with the stable FE hostname.
 */
export function getRequestOrigin(): string | null {
  const configuredOrigin =
    normalizeOriginCandidate(process.env.CONSUMER_APP_ORIGIN) ??
    normalizeOriginCandidate(process.env.NEXT_PUBLIC_APP_ORIGIN) ??
    normalizeOriginCandidate(process.env[VERCEL_PROJECT_PRODUCTION_URL_ENV]);

  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (process.env.NODE_ENV !== `production`) {
    return `http://localhost:3001`;
  }

  return null;
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
