import { type default as express } from 'express';

import {
  getApiV2ConsumerAccessTokenCookieKey,
  getApiV2ConsumerAccessTokenCookieKeysForRead,
  getApiV2ConsumerCsrfTokenCookieKey,
  getApiV2ConsumerDeviceCookieKey,
  getApiV2ConsumerDeviceCookieKeysForRead,
  getApiV2ConsumerRefreshTokenCookieKeysForRead,
  getApiV2GoogleOAuthStateCookieKey,
  getApiV2ConsumerRefreshTokenCookieKey,
  getAdminAuthCookieOptions,
  getConsumerAuthCookieOptions,
  getConsumerDeviceCookieOptions,
  getCookieClearOptions,
  getCsrfCookieOptions,
  getOAuthStateCookieOptions,
  DEVICE_COOKIE_MAX_AGE_SECONDS,
  type AuthCookieRuntime,
  type ConsumerCookieRuntime,
  type SharedHttpOnlyCookieOptions,
  type SharedReadableCookieOptions,
  type TCookieKey,
} from '@remoola/api-types';

import { envs } from '../envs';

function getApiAuthCookieRuntime(): AuthCookieRuntime {
  return {
    isProduction: envs.NODE_ENV === `production`,
    isVercel: envs.VERCEL !== 0,
    cookieSecure: envs.COOKIE_SECURE,
  };
}

function getApiConsumerCookieRuntime(req?: express.Request): ConsumerCookieRuntime {
  return {
    ...getApiAuthCookieRuntime(),
    isSecureRequest: isSecureExpressRequest(req),
  };
}

export function isSecureExpressRequest(req?: express.Request): boolean {
  const forwardedProto = req?.headers?.[`x-forwarded-proto`];
  return (
    req?.secure === true || (typeof forwardedProto === `string` && forwardedProto.split(`,`)[0]?.trim() === `https`)
  );
}

export function getApiAdminAuthCookieOptions(): SharedHttpOnlyCookieOptions {
  return getAdminAuthCookieOptions(getApiAuthCookieRuntime());
}

export function getApiAdminAuthCookieClearOptions(): Pick<
  SharedHttpOnlyCookieOptions,
  `httpOnly` | `path` | `sameSite` | `secure`
> {
  return getCookieClearOptions(getApiAdminAuthCookieOptions());
}

export function getApiConsumerAccessTokenCookieKey(req?: express.Request): TCookieKey {
  return getApiV2ConsumerAccessTokenCookieKey(getApiConsumerCookieRuntime(req));
}

export function getApiConsumerRefreshTokenCookieKey(req?: express.Request): TCookieKey {
  return getApiV2ConsumerRefreshTokenCookieKey(getApiConsumerCookieRuntime(req));
}

export function getApiConsumerAccessTokenCookieKeysForRead(): readonly TCookieKey[] {
  return getApiV2ConsumerAccessTokenCookieKeysForRead();
}

export function getApiConsumerRefreshTokenCookieKeysForRead(): readonly TCookieKey[] {
  return getApiV2ConsumerRefreshTokenCookieKeysForRead();
}

export function getApiConsumerAuthCookieOptions(req?: express.Request): SharedHttpOnlyCookieOptions {
  return getConsumerAuthCookieOptions(getApiConsumerCookieRuntime(req));
}

export function getApiConsumerAuthCookieClearOptions(
  req?: express.Request,
): Pick<SharedHttpOnlyCookieOptions, `httpOnly` | `path` | `sameSite` | `secure`> {
  return getCookieClearOptions(getApiConsumerAuthCookieOptions(req));
}

export function getApiConsumerCsrfCookieOptions(
  req?: express.Request,
): SharedReadableCookieOptions & { maxAge: number } {
  return { ...getCsrfCookieOptions(getApiConsumerCookieRuntime(req)), maxAge: envs.JWT_REFRESH_TOKEN_EXPIRES_IN };
}

export function getApiConsumerCsrfCookieClearOptions(
  req?: express.Request,
): Pick<SharedReadableCookieOptions, `httpOnly` | `path` | `sameSite` | `secure`> {
  return getCookieClearOptions(getApiConsumerCsrfCookieOptions(req));
}

export function getApiConsumerCsrfTokenCookieKey(): TCookieKey {
  return getApiV2ConsumerCsrfTokenCookieKey();
}

export function getApiOAuthStateCookieOptions(req?: express.Request): SharedHttpOnlyCookieOptions {
  return getOAuthStateCookieOptions({
    ...getApiAuthCookieRuntime(),
    isSecureRequest: isSecureExpressRequest(req),
  });
}

export function getApiGoogleOAuthStateCookieKey(): TCookieKey {
  return getApiV2GoogleOAuthStateCookieKey();
}

export function getApiConsumerDeviceCookieKey(req?: express.Request): TCookieKey {
  return getApiV2ConsumerDeviceCookieKey(getApiConsumerCookieRuntime(req));
}

export function getApiConsumerDeviceCookieKeysForRead(): readonly TCookieKey[] {
  return getApiV2ConsumerDeviceCookieKeysForRead();
}

export function getApiConsumerDeviceCookieOptions(
  req?: express.Request,
): SharedHttpOnlyCookieOptions & { maxAge: number } {
  return {
    ...getConsumerDeviceCookieOptions(getApiConsumerCookieRuntime(req)),
    // Express expects maxAge in milliseconds.
    maxAge: DEVICE_COOKIE_MAX_AGE_SECONDS * 1000,
  };
}

export function getApiConsumerDeviceCookieClearOptions(
  req?: express.Request,
): Pick<SharedHttpOnlyCookieOptions, `httpOnly` | `path` | `sameSite` | `secure`> {
  return getCookieClearOptions(getApiConsumerDeviceCookieOptions(req));
}
