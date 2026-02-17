export const HTTP_HEADER_KEYS = {
  X_REQUEST_ID: `x-request-id`,
} as const;
export type THttpHeaderKey = (typeof HTTP_HEADER_KEYS)[keyof typeof HTTP_HEADER_KEYS];

export const COOKIE_KEYS = {
  ACCESS_TOKEN: `access_token`,
  REFRESH_TOKEN: `refresh_token`,
  GOOGLE_OAUTH_STATE: `google_oauth_state`,
} as const;
export type TCookieKey = (typeof COOKIE_KEYS)[keyof typeof COOKIE_KEYS];
