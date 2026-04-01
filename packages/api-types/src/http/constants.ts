/**
 * Cookie names. Admin and consumer use separate keys so both can stay logged in
 * in the same browser (same domain) without overwriting each other.
 */
const LOCAL_CONSUMER_ACCESS_TOKEN = `consumer_access_token` as const;
const LOCAL_CONSUMER_REFRESH_TOKEN = `consumer_refresh_token` as const;
const LOCAL_API_V2_CONSUMER_ACCESS_TOKEN = `consumer_v2_access_token` as const;
const LOCAL_API_V2_CONSUMER_REFRESH_TOKEN = `consumer_v2_refresh_token` as const;

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
  /** Dedicated consumer auth namespace for the api-v2 + consumer-css-grid pair. */
  API_V2_CONSUMER_ACCESS_TOKEN: `__Host-consumer_v2_access_token`,
  API_V2_CONSUMER_REFRESH_TOKEN: `__Host-consumer_v2_refresh_token`,
  /** Local HTTP fallback for the api-v2 + consumer-css-grid pair. */
  LOCAL_API_V2_CONSUMER_ACCESS_TOKEN: LOCAL_API_V2_CONSUMER_ACCESS_TOKEN,
  LOCAL_API_V2_CONSUMER_REFRESH_TOKEN: LOCAL_API_V2_CONSUMER_REFRESH_TOKEN,
  GOOGLE_OAUTH_STATE: `google_oauth_state`,
  CSRF_TOKEN: `csrf_token`,
  /** Consumer device id (backend-issued); host-only in production. */
  CONSUMER_DEVICE_ID: `__Host-device_id`,
  /** Local HTTP fallback when __Host-* cannot be set. */
  LOCAL_CONSUMER_DEVICE_ID: `consumer_device_id`,
  /** Dedicated device id namespace for the api-v2 + consumer-css-grid pair. */
  API_V2_CONSUMER_DEVICE_ID: `__Host-consumer_v2_device_id`,
  /** Local HTTP fallback for the api-v2 + consumer-css-grid pair. */
  LOCAL_API_V2_CONSUMER_DEVICE_ID: `consumer_v2_device_id`,
  API_V2_GOOGLE_OAUTH_STATE: `consumer_v2_google_oauth_state`,
  API_V2_CSRF_TOKEN: `consumer_v2_csrf_token`,
} as const;
export type TCookieKey = (typeof COOKIE_KEYS)[keyof typeof COOKIE_KEYS];
