import {
  getAdminAccessTokenCookieKey,
  getAdminAccessTokenCookieKeysForRead,
  getAdminCsrfTokenCookieKey,
  getAdminCsrfTokenCookieKeysForRead,
  getAdminRefreshTokenCookieKey,
  getAdminRefreshTokenCookieKeysForRead,
  type AuthCookieRuntime,
} from '@remoola/api-types';

function getAdminCookieRuntime(): AuthCookieRuntime {
  return {
    isProduction: process.env.NODE_ENV === `production`,
    isVercel: process.env.VERCEL === `1`,
    cookieSecure: process.env.COOKIE_SECURE === `true`,
  };
}

export function getAdminAccessCookieKey(): string {
  return getAdminAccessTokenCookieKey(getAdminCookieRuntime());
}

export function getAdminRefreshCookieKey(): string {
  return getAdminRefreshTokenCookieKey(getAdminCookieRuntime());
}

export function getAdminCsrfCookieKey(): string {
  return getAdminCsrfTokenCookieKey(getAdminCookieRuntime());
}

export function getAdminAccessCookieKeysForRead(): readonly string[] {
  return getAdminAccessTokenCookieKeysForRead();
}

export function getAdminRefreshCookieKeysForRead(): readonly string[] {
  return getAdminRefreshTokenCookieKeysForRead();
}

export function getAdminCsrfCookieKeysForRead(): readonly string[] {
  return getAdminCsrfTokenCookieKeysForRead();
}
