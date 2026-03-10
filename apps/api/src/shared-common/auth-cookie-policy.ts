import {
  getConsumerAccessTokenCookieKey,
  getAdminAuthCookieOptions,
  getConsumerAuthCookieOptions,
  getConsumerRefreshTokenCookieKey,
  getCookieClearOptions,
  getCsrfCookieOptions,
  getOAuthStateCookieOptions,
  type AuthCookieRuntime,
  type ConsumerCookieRuntime,
  type SharedHttpOnlyCookieOptions,
  type SharedReadableCookieOptions,
  type TCookieKey,
} from '@remoola/api-types';

import { envs, JWT_REFRESH_TTL } from '../envs';

import type express from 'express';

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
  return getConsumerAccessTokenCookieKey(getApiConsumerCookieRuntime(req));
}

export function getApiConsumerRefreshTokenCookieKey(req?: express.Request): TCookieKey {
  return getConsumerRefreshTokenCookieKey(getApiConsumerCookieRuntime(req));
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
  return { ...getCsrfCookieOptions(getApiConsumerCookieRuntime(req)), maxAge: JWT_REFRESH_TTL };
}

export function getApiConsumerCsrfCookieClearOptions(
  req?: express.Request,
): Pick<SharedReadableCookieOptions, `httpOnly` | `path` | `sameSite` | `secure`> {
  return getCookieClearOptions(getApiConsumerCsrfCookieOptions(req));
}

export function getApiOAuthStateCookieOptions(req?: express.Request): SharedHttpOnlyCookieOptions {
  return getOAuthStateCookieOptions({
    ...getApiAuthCookieRuntime(),
    isSecureRequest: isSecureExpressRequest(req),
  });
}
