/**
 * Sanitizes a candidate `next` value for use in login redirect URLs.
 * Rejects external origin, protocol-relative, malformed decode; returns fallback when invalid/empty.
 */
export function sanitizeNextForRedirect(raw: string | null | undefined, fallback: string): string {
  if (!raw || raw.length === 0) return fallback;

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return fallback;
  }

  if (!decoded.startsWith(`/`)) return fallback;
  if (decoded.startsWith(`//`)) return fallback;
  if (/^https?:\/\//i.test(decoded)) return fallback;
  if (/[\r\n]/.test(decoded)) return fallback;
  if (decoded === `/logout` || decoded.startsWith(`/logout`)) return fallback;

  return decoded;
}

/**
 * Removes stale auth-related query params from a URL (mutates url.searchParams).
 * Use after first consumption of session_expired / auth_notice so the URL does not retain them.
 * @param url - URL to mutate
 * @param paramKeys - Keys to remove (e.g. SESSION_EXPIRED_QUERY, AUTH_NOTICE_QUERY)
 */
export function removeStaleLoginParams(url: URL, paramKeys: string[]): void {
  for (const key of paramKeys) {
    url.searchParams.delete(key);
  }
}
