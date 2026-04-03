/**
 * Builds the browser-facing consumer Google OAuth start URL.
 * `URLSearchParams` performs the required encoding, so callers must not pre-encode `nextPath`.
 */
export function buildConsumerGoogleOAuthStartUrl(nextPath: string): string {
  const url = new URL(`/api/consumer/auth/google/start`, `http://localhost`);
  url.searchParams.set(`next`, nextPath);
  return `${url.pathname}${url.search}`;
}
