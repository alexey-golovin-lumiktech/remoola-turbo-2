/**
 * Cookie names. Admin and consumer use separate keys so both can stay logged in
 * in the same browser (same domain) without overwriting each other.
 */
const LOCAL_ADMIN_ACCESS_TOKEN = `admin_access_token` as const;
const LOCAL_ADMIN_REFRESH_TOKEN = `admin_refresh_token` as const;
const LOCAL_ADMIN_CSRF_TOKEN = `admin_csrf_token` as const;
const LOCAL_CONSUMER_ACCESS_TOKEN = `consumer_access_token` as const;
const LOCAL_CONSUMER_REFRESH_TOKEN = `consumer_refresh_token` as const;
const LOCAL_CONSUMER_CSRF_TOKEN = `consumer_csrf_token` as const;
const LOCAL_CONSUMER_GOOGLE_OAUTH_STATE = `consumer_google_oauth_state` as const;
const LOCAL_CONSUMER_GOOGLE_SIGNUP_SESSION = `consumer_google_signup_session` as const;
const LOCAL_CONSUMER_MOBILE_ACCESS_TOKEN = `consumer_mobile_access_token` as const;
const LOCAL_CONSUMER_MOBILE_REFRESH_TOKEN = `consumer_mobile_refresh_token` as const;
const LOCAL_CONSUMER_MOBILE_CSRF_TOKEN = `consumer_mobile_csrf_token` as const;
const LOCAL_CONSUMER_MOBILE_GOOGLE_OAUTH_STATE = `consumer_mobile_google_oauth_state` as const;
const LOCAL_CONSUMER_MOBILE_GOOGLE_SIGNUP_SESSION = `consumer_mobile_google_signup_session` as const;
const LOCAL_CONSUMER_CSS_GRID_ACCESS_TOKEN = `consumer_css_grid_access_token` as const;
const LOCAL_CONSUMER_CSS_GRID_REFRESH_TOKEN = `consumer_css_grid_refresh_token` as const;
const LOCAL_CONSUMER_CSS_GRID_CSRF_TOKEN = `consumer_css_grid_csrf_token` as const;
const LOCAL_CONSUMER_CSS_GRID_GOOGLE_OAUTH_STATE = `consumer_css_grid_google_oauth_state` as const;
const LOCAL_CONSUMER_CSS_GRID_GOOGLE_SIGNUP_SESSION = `consumer_css_grid_google_signup_session` as const;

export const COOKIE_KEYS = {
  /** Admin auth; use for /api/admin/* so admin and consumer sessions coexist. */
  ADMIN_ACCESS_TOKEN: `__Host-admin_access_token`,
  ADMIN_REFRESH_TOKEN: `__Host-admin_refresh_token`,
  ADMIN_CSRF_TOKEN: `__Host-admin_csrf_token`,
  LOCAL_ADMIN_ACCESS_TOKEN: LOCAL_ADMIN_ACCESS_TOKEN,
  LOCAL_ADMIN_REFRESH_TOKEN: LOCAL_ADMIN_REFRESH_TOKEN,
  LOCAL_ADMIN_CSRF_TOKEN: LOCAL_ADMIN_CSRF_TOKEN,

  /** Consumer auth; use for /api/consumer/* so admin and consumer sessions coexist. */
  CONSUMER_ACCESS_TOKEN: `__Host-consumer_access_token`,
  CONSUMER_REFRESH_TOKEN: `__Host-consumer_refresh_token`,
  CONSUMER_GOOGLE_SIGNUP_SESSION: `__Host-consumer_google_signup_session`,
  /** Local HTTP fallback; browsers reject __Host-* cookies without a secure origin. */
  LOCAL_CONSUMER_ACCESS_TOKEN: LOCAL_CONSUMER_ACCESS_TOKEN,
  LOCAL_CONSUMER_REFRESH_TOKEN: LOCAL_CONSUMER_REFRESH_TOKEN,
  LOCAL_CONSUMER_CSRF_TOKEN: LOCAL_CONSUMER_CSRF_TOKEN,
  LOCAL_CONSUMER_GOOGLE_OAUTH_STATE: LOCAL_CONSUMER_GOOGLE_OAUTH_STATE,
  LOCAL_CONSUMER_GOOGLE_SIGNUP_SESSION: LOCAL_CONSUMER_GOOGLE_SIGNUP_SESSION,
  CONSUMER_MOBILE_ACCESS_TOKEN: `__Host-consumer_mobile_access_token`,
  CONSUMER_MOBILE_REFRESH_TOKEN: `__Host-consumer_mobile_refresh_token`,
  CONSUMER_MOBILE_CSRF_TOKEN: `__Host-consumer_mobile_csrf_token`,
  CONSUMER_MOBILE_GOOGLE_OAUTH_STATE: `__Host-consumer_mobile_google_oauth_state`,
  CONSUMER_MOBILE_GOOGLE_SIGNUP_SESSION: `__Host-consumer_mobile_google_signup_session`,
  LOCAL_CONSUMER_MOBILE_ACCESS_TOKEN: LOCAL_CONSUMER_MOBILE_ACCESS_TOKEN,
  LOCAL_CONSUMER_MOBILE_REFRESH_TOKEN: LOCAL_CONSUMER_MOBILE_REFRESH_TOKEN,
  LOCAL_CONSUMER_MOBILE_CSRF_TOKEN: LOCAL_CONSUMER_MOBILE_CSRF_TOKEN,
  LOCAL_CONSUMER_MOBILE_GOOGLE_OAUTH_STATE: LOCAL_CONSUMER_MOBILE_GOOGLE_OAUTH_STATE,
  LOCAL_CONSUMER_MOBILE_GOOGLE_SIGNUP_SESSION: LOCAL_CONSUMER_MOBILE_GOOGLE_SIGNUP_SESSION,
  API_V2_CONSUMER_ACCESS_TOKEN: `__Host-consumer_css_grid_access_token`,
  API_V2_CONSUMER_REFRESH_TOKEN: `__Host-consumer_css_grid_refresh_token`,
  API_V2_CONSUMER_GOOGLE_SIGNUP_SESSION: `__Host-consumer_css_grid_google_signup_session`,
  LOCAL_API_V2_CONSUMER_ACCESS_TOKEN: LOCAL_CONSUMER_CSS_GRID_ACCESS_TOKEN,
  LOCAL_API_V2_CONSUMER_REFRESH_TOKEN: LOCAL_CONSUMER_CSS_GRID_REFRESH_TOKEN,
  LOCAL_API_V2_CSRF_TOKEN: LOCAL_CONSUMER_CSS_GRID_CSRF_TOKEN,
  LOCAL_API_V2_GOOGLE_OAUTH_STATE: LOCAL_CONSUMER_CSS_GRID_GOOGLE_OAUTH_STATE,
  LOCAL_API_V2_CONSUMER_GOOGLE_SIGNUP_SESSION: LOCAL_CONSUMER_CSS_GRID_GOOGLE_SIGNUP_SESSION,
  GOOGLE_OAUTH_STATE: `__Host-consumer_google_oauth_state`,
  CSRF_TOKEN: `__Host-consumer_csrf_token`,
  /** Consumer device id (backend-issued); host-only in production. */
  CONSUMER_DEVICE_ID: `__Host-consumer_device_id`,
  /** Local HTTP fallback when __Host-* cannot be set. */
  LOCAL_CONSUMER_DEVICE_ID: `consumer_device_id`,
  CONSUMER_MOBILE_DEVICE_ID: `__Host-consumer_mobile_device_id`,
  LOCAL_CONSUMER_MOBILE_DEVICE_ID: `consumer_mobile_device_id`,
  API_V2_CONSUMER_DEVICE_ID: `__Host-consumer_css_grid_device_id`,
  LOCAL_API_V2_CONSUMER_DEVICE_ID: `consumer_css_grid_device_id`,
  API_V2_GOOGLE_OAUTH_STATE: `__Host-consumer_css_grid_google_oauth_state`,
  API_V2_CSRF_TOKEN: `__Host-consumer_css_grid_csrf_token`,
} as const;
export type TCookieKey = (typeof COOKIE_KEYS)[keyof typeof COOKIE_KEYS];
