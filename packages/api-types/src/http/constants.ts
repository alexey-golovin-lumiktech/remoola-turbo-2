/**
 * Cookie names. Admin and consumer use separate keys so both can stay logged in
 * in the same browser (same domain) without overwriting each other.
 */
export const COOKIE_KEYS = {
  ACCESS_TOKEN: `access_token`,
  REFRESH_TOKEN: `refresh_token`,
  /** Admin auth; use for /api/admin/* so admin and consumer sessions coexist. */
  ADMIN_ACCESS_TOKEN: `admin_access_token`,
  ADMIN_REFRESH_TOKEN: `admin_refresh_token`,
  /** Consumer auth; use for /api/consumer/* so admin and consumer sessions coexist. */
  CONSUMER_ACCESS_TOKEN: `consumer_access_token`,
  CONSUMER_REFRESH_TOKEN: `consumer_refresh_token`,
  GOOGLE_OAUTH_STATE: `google_oauth_state`,
} as const;
export type TCookieKey = (typeof COOKIE_KEYS)[keyof typeof COOKIE_KEYS];
