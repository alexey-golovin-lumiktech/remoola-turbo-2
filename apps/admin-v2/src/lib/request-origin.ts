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

export function getRequestOrigin(): string {
  const configuredOrigin =
    normalizeOriginCandidate(process.env.ADMIN_V2_APP_ORIGIN) ??
    normalizeOriginCandidate(process.env.NEXT_PUBLIC_APP_ORIGIN);
  if (configuredOrigin) {
    return configuredOrigin;
  }
  if (process.env.NODE_ENV !== `production`) {
    return `http://localhost:3011`;
  }
  throw new Error(`Admin v2 app origin is not configured`);
}

export function getBypassHeaders(): Record<string, string> {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (secret) {
    return { 'x-vercel-protection-bypass': secret };
  }
  return {};
}
