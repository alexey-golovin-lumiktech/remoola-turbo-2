import { type default as express } from 'express';

import {
  getAdminAccessTokenCookieKey,
  getAdminAccessTokenCookieKeysForRead,
  getAdminCsrfTokenCookieKey,
  getAdminCsrfTokenCookieKeysForRead,
  getAdminRefreshTokenCookieKey,
  getAdminRefreshTokenCookieKeysForRead,
  getAdminAuthCookieOptions,
  getConsumerAuthCookieOptions,
  getConsumerDeviceCookieOptions,
  getCookieClearOptions,
  getCsrfCookieOptions,
  getOAuthStateCookieOptions,
  getScopedConsumerAccessTokenCookieKey,
  getScopedConsumerAccessTokenCookieKeysForRead,
  getScopedConsumerCsrfTokenCookieKey,
  getScopedConsumerCsrfTokenCookieKeysForRead,
  getScopedConsumerDeviceCookieKey,
  getScopedConsumerDeviceCookieKeysForRead,
  getScopedConsumerGoogleOAuthStateCookieKey,
  getScopedConsumerGoogleOAuthStateCookieKeysForRead,
  getScopedConsumerGoogleSignupSessionCookieKey,
  getScopedConsumerGoogleSignupSessionCookieKeysForRead,
  getScopedConsumerRefreshTokenCookieKey,
  getScopedConsumerRefreshTokenCookieKeysForRead,
  DEVICE_COOKIE_MAX_AGE_SECONDS,
  type AuthCookieRuntime,
  type ConsumerAppScope,
  type ConsumerCookieRuntime,
  type SharedHttpOnlyCookieOptions,
  type SharedReadableCookieOptions,
  type TCookieKey,
} from '@remoola/api-types';

import { envs } from '../envs';

export const DEFAULT_API_CONSUMER_SCOPE: ConsumerAppScope = `consumer`;

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

export function getApiAdminAccessTokenCookieKey(): TCookieKey {
  return getAdminAccessTokenCookieKey(getApiAuthCookieRuntime());
}

export function getApiAdminRefreshTokenCookieKey(): TCookieKey {
  return getAdminRefreshTokenCookieKey(getApiAuthCookieRuntime());
}

export function getApiAdminAccessTokenCookieKeysForRead(): readonly TCookieKey[] {
  return getAdminAccessTokenCookieKeysForRead();
}

export function getApiAdminRefreshTokenCookieKeysForRead(): readonly TCookieKey[] {
  return getAdminRefreshTokenCookieKeysForRead();
}

export function getApiAdminAuthCookieClearOptions(): Pick<
  SharedHttpOnlyCookieOptions,
  `httpOnly` | `path` | `sameSite` | `secure`
> {
  return getCookieClearOptions(getApiAdminAuthCookieOptions());
}

export function getApiAdminCsrfCookieOptions(): SharedReadableCookieOptions & { maxAge: number } {
  return { ...getCsrfCookieOptions(getApiAuthCookieRuntime()), maxAge: envs.JWT_REFRESH_TOKEN_EXPIRES_IN };
}

export function getApiAdminCsrfTokenCookieKey(): TCookieKey {
  return getAdminCsrfTokenCookieKey(getApiAuthCookieRuntime());
}

export function getApiAdminCsrfTokenCookieKeysForRead(): readonly TCookieKey[] {
  return getAdminCsrfTokenCookieKeysForRead();
}

export function getApiAdminCsrfCookieClearOptions(): Pick<
  SharedReadableCookieOptions,
  `httpOnly` | `path` | `sameSite` | `secure`
> {
  return getCookieClearOptions(getApiAdminCsrfCookieOptions());
}

export function getApiConsumerAccessTokenCookieKey(
  req?: express.Request,
  scope: ConsumerAppScope = DEFAULT_API_CONSUMER_SCOPE,
): TCookieKey {
  return getScopedConsumerAccessTokenCookieKey(scope, getApiConsumerCookieRuntime(req));
}

export function getApiConsumerRefreshTokenCookieKey(
  req?: express.Request,
  scope: ConsumerAppScope = DEFAULT_API_CONSUMER_SCOPE,
): TCookieKey {
  return getScopedConsumerRefreshTokenCookieKey(scope, getApiConsumerCookieRuntime(req));
}

export function getApiConsumerAccessTokenCookieKeysForRead(
  scope: ConsumerAppScope = DEFAULT_API_CONSUMER_SCOPE,
): readonly TCookieKey[] {
  return getScopedConsumerAccessTokenCookieKeysForRead(scope);
}

export function getApiConsumerRefreshTokenCookieKeysForRead(
  scope: ConsumerAppScope = DEFAULT_API_CONSUMER_SCOPE,
): readonly TCookieKey[] {
  return getScopedConsumerRefreshTokenCookieKeysForRead(scope);
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

export function getApiConsumerCsrfTokenCookieKey(
  req?: express.Request,
  scope: ConsumerAppScope = DEFAULT_API_CONSUMER_SCOPE,
): TCookieKey {
  return getScopedConsumerCsrfTokenCookieKey(scope, getApiConsumerCookieRuntime(req));
}

export function getApiConsumerCsrfTokenCookieKeysForRead(
  scope: ConsumerAppScope = DEFAULT_API_CONSUMER_SCOPE,
): readonly TCookieKey[] {
  return getScopedConsumerCsrfTokenCookieKeysForRead(scope);
}

export function getApiOAuthStateCookieKey(
  req?: express.Request,
  scope: ConsumerAppScope = DEFAULT_API_CONSUMER_SCOPE,
): TCookieKey {
  return getScopedConsumerGoogleOAuthStateCookieKey(scope, getApiConsumerCookieRuntime(req));
}

export function getApiOAuthStateCookieKeysForRead(
  scope: ConsumerAppScope = DEFAULT_API_CONSUMER_SCOPE,
): readonly TCookieKey[] {
  return getScopedConsumerGoogleOAuthStateCookieKeysForRead(scope);
}

export function getApiOAuthStateCookieOptions(req?: express.Request): SharedHttpOnlyCookieOptions {
  return getOAuthStateCookieOptions({
    ...getApiAuthCookieRuntime(),
    isSecureRequest: isSecureExpressRequest(req),
  });
}

export function getApiConsumerDeviceCookieKey(
  req?: express.Request,
  scope: ConsumerAppScope = DEFAULT_API_CONSUMER_SCOPE,
): TCookieKey {
  return getScopedConsumerDeviceCookieKey(scope, getApiConsumerCookieRuntime(req));
}

export function getApiConsumerDeviceCookieKeysForRead(
  scope: ConsumerAppScope = DEFAULT_API_CONSUMER_SCOPE,
): readonly TCookieKey[] {
  return getScopedConsumerDeviceCookieKeysForRead(scope);
}

export function getApiConsumerGoogleSignupSessionCookieKey(
  req?: express.Request,
  scope: ConsumerAppScope = DEFAULT_API_CONSUMER_SCOPE,
): TCookieKey {
  return getScopedConsumerGoogleSignupSessionCookieKey(scope, getApiConsumerCookieRuntime(req));
}

export function getApiConsumerGoogleSignupSessionCookieKeysForRead(
  scope: ConsumerAppScope = DEFAULT_API_CONSUMER_SCOPE,
): readonly TCookieKey[] {
  return getScopedConsumerGoogleSignupSessionCookieKeysForRead(scope);
}

export function getApiConsumerGoogleSignupSessionCookieOptions(req?: express.Request): SharedHttpOnlyCookieOptions {
  return getConsumerAuthCookieOptions(getApiConsumerCookieRuntime(req));
}

export function getApiConsumerGoogleSignupSessionCookieClearOptions(
  req?: express.Request,
): Pick<SharedHttpOnlyCookieOptions, `httpOnly` | `path` | `sameSite` | `secure`> {
  return getCookieClearOptions(getApiConsumerGoogleSignupSessionCookieOptions(req));
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
