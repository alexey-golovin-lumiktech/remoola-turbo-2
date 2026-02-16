export const PASSWORD_NOT_SET_YET =
  `Consumer password is not set yet. Try using a different way to log in to the app, or restore your password ` as const; //eslint-disable-line

export const INVALID_CREDENTIALS = `Invalid Credentials` as const;
export const ADMIN_NOT_FOUND = `Admin not found` as const;
export const NOT_FOUND = `Not found` as const;
export const INVALID_PASSWORD = `Invalid password` as const;
export const INVALID_EMAIL = `Invalid email` as const;
export const TEMPORARY_PASSWORD_LIFETIME_HOURS = 3 as const;
export const DEFAULT_DUE_DATE_IN_DAYS30 = 30 as const;
export const PASSWORD_RE = /(?!.* )(?=(.*[A-Z]){2,})(?=.*?[a-z])(?=.*[1-9]{1,})(?=.*?[#?!@$%^&*-]).{8,}$/;
export const ACCESS_TOKEN_COOKIE_KEY = `access_token` as const; // according to http protocol
export const REFRESH_TOKEN_COOKIE_KEY = `refresh_token` as const; // according to http protocol
export const GOOGLE_OAUTH_STATE_COOKIE_KEY = `google_oauth_state` as const;

export const constants = {
  INVALID_CREDENTIALS,
  ADMIN_NOT_FOUND,
  NOT_FOUND,
  INVALID_PASSWORD,
  PASSWORD_NOT_SET_YET,
  INVALID_EMAIL,
  TEMPORARY_PASSWORD_LIFETIME_HOURS,
  DEFAULT_DUE_DATE_IN_DAYS30,
  PASSWORD_RE,
  ACCESS_TOKEN_COOKIE_KEY,
  REFRESH_TOKEN_COOKIE_KEY,
  GOOGLE_OAUTH_STATE_COOKIE_KEY,
} as const;
