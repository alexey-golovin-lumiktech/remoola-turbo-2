import {
  COOKIE_KEYS,
  getConsumerAccessTokenCookieKey,
  getConsumerAuthCookieOptions,
  getConsumerRefreshTokenCookieKey,
  getCookieClearOptions,
  getCsrfCookieOptions,
  getOAuthStateCookieOptions,
  type OAuthCookieRuntime,
} from '@remoola/api-types';

import type { NextResponse } from 'next/server';

function isSecureRequest(request: Request): boolean {
  const forwardedProto = request.headers.get(`x-forwarded-proto`);
  return new URL(request.url).protocol === `https:` || forwardedProto?.split(`,`)[0]?.trim() === `https`;
}

export function getConsumerMobileCookieRuntime(request: Request): OAuthCookieRuntime {
  return {
    isProduction: process.env.NODE_ENV === `production`,
    isVercel: process.env.VERCEL === `1`,
    cookieSecure: process.env.COOKIE_SECURE === `true`,
    isSecureRequest: isSecureRequest(request),
  };
}

export function clearConsumerAuthCookies(response: NextResponse, request: Request): void {
  const runtime = getConsumerMobileCookieRuntime(request);
  const authClearOpts = getCookieClearOptions(getConsumerAuthCookieOptions(runtime));
  const oauthClearOpts = getCookieClearOptions(getOAuthStateCookieOptions(runtime));
  const csrfClearOpts = getCookieClearOptions(getCsrfCookieOptions(runtime));
  response.cookies.set(getConsumerAccessTokenCookieKey(runtime), ``, { ...authClearOpts, maxAge: 0 });
  response.cookies.set(getConsumerRefreshTokenCookieKey(runtime), ``, { ...authClearOpts, maxAge: 0 });
  response.cookies.set(COOKIE_KEYS.GOOGLE_OAUTH_STATE, ``, { ...oauthClearOpts, maxAge: 0 });
  response.cookies.set(COOKIE_KEYS.CSRF_TOKEN, ``, { ...csrfClearOpts, maxAge: 0 });
}

export function getCsrfTokenFromRequest(request: Request): string | null {
  const csrfFromHeader = request.headers.get(`x-csrf-token`);
  if (csrfFromHeader) return csrfFromHeader;

  const cookie = request.headers.get(`cookie`) ?? ``;
  return (
    cookie
      .split(`;`)
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${COOKIE_KEYS.CSRF_TOKEN}=`))
      ?.split(`=`)
      ?.slice(1)
      .join(`=`) ?? null
  );
}
