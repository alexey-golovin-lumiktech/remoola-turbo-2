/**
 * Cookie names. Admin and consumer use separate keys so both can stay logged in
 * in the same browser (same domain) without overwriting each other.
 */
const LOCAL_CONSUMER_ACCESS_TOKEN = `consumer_access_token` as const;
const LOCAL_CONSUMER_REFRESH_TOKEN = `consumer_refresh_token` as const;

export const COOKIE_KEYS = {
  /** Admin auth; use for /api/admin/* so admin and consumer sessions coexist. */
  ADMIN_ACCESS_TOKEN: `admin_access_token`,
  ADMIN_REFRESH_TOKEN: `admin_refresh_token`,

  /** Consumer auth; use for /api/consumer/* so admin and consumer sessions coexist. */
  CONSUMER_ACCESS_TOKEN: `__Host-access_token`,
  CONSUMER_REFRESH_TOKEN: `__Host-refresh_token`,
  /** Local HTTP fallback; browsers reject __Host-* cookies without a secure origin. */
  LOCAL_CONSUMER_ACCESS_TOKEN: LOCAL_CONSUMER_ACCESS_TOKEN,
  LOCAL_CONSUMER_REFRESH_TOKEN: LOCAL_CONSUMER_REFRESH_TOKEN,
  GOOGLE_OAUTH_STATE: `google_oauth_state`,
  CSRF_TOKEN: `csrf_token`,
} as const;
export type TCookieKey = (typeof COOKIE_KEYS)[keyof typeof COOKIE_KEYS];
