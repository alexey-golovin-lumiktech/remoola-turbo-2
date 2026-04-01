import { type NextResponse } from 'next/server';

import {
  getApiV2ConsumerAccessTokenCookieKeysForRead,
  getApiV2ConsumerCsrfTokenCookieKey,
  getApiV2ConsumerDeviceCookieKeysForRead,
  getApiV2ConsumerRefreshTokenCookieKeysForRead,
  getApiV2GoogleOAuthStateCookieKey,
  getConsumerAuthCookieOptions,
  getCookieClearOptions,
  getCsrfCookieOptions,
  getOAuthStateCookieOptions,
  type OAuthCookieRuntime,
} from '@remoola/api-types';

function isSecureRequest(request: Request): boolean {
  const forwardedProto = request.headers.get(`x-forwarded-proto`);
  return new URL(request.url).protocol === `https:` || forwardedProto?.split(`,`)[0]?.trim() === `https`;
}

export function getConsumerCssGridCookieRuntime(request: Request): OAuthCookieRuntime {
  return {
    isProduction: process.env.NODE_ENV === `production`,
    isVercel: process.env.VERCEL === `1`,
    cookieSecure: process.env.COOKIE_SECURE === `true`,
    isSecureRequest: isSecureRequest(request),
  };
}

export function clearConsumerAuthCookies(response: NextResponse, request: Request): void {
  const runtime = getConsumerCssGridCookieRuntime(request);
  const authClearOpts = getCookieClearOptions(getConsumerAuthCookieOptions(runtime));
  const oauthClearOpts = getCookieClearOptions(getOAuthStateCookieOptions(runtime));
  const csrfClearOpts = getCookieClearOptions(getCsrfCookieOptions(runtime));
  const csrfCookieKey = getApiV2ConsumerCsrfTokenCookieKey();
  const oauthStateCookieKey = getApiV2GoogleOAuthStateCookieKey();

  for (const key of getApiV2ConsumerAccessTokenCookieKeysForRead()) {
    response.cookies.set(key, ``, { ...authClearOpts, maxAge: 0 });
  }
  for (const key of getApiV2ConsumerRefreshTokenCookieKeysForRead()) {
    response.cookies.set(key, ``, { ...authClearOpts, maxAge: 0 });
  }
  for (const key of getApiV2ConsumerDeviceCookieKeysForRead()) {
    response.cookies.set(key, ``, { ...authClearOpts, maxAge: 0 });
  }

  response.cookies.set(oauthStateCookieKey, ``, { ...oauthClearOpts, maxAge: 0 });
  response.cookies.set(csrfCookieKey, ``, { ...csrfClearOpts, maxAge: 0 });
}

export function getCsrfTokenFromRequest(request: Request): string | null {
  const csrfFromHeader = request.headers.get(`x-csrf-token`);
  if (csrfFromHeader) return csrfFromHeader;

  const cookie = request.headers.get(`cookie`) ?? ``;
  const csrfCookieKey = getApiV2ConsumerCsrfTokenCookieKey();
  return (
    cookie
      .split(`;`)
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${csrfCookieKey}=`))
      ?.split(`=`)
      ?.slice(1)
      .join(`=`) ?? null
  );
}
