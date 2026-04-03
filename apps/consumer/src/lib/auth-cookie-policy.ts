import { type NextResponse } from 'next/server';

import {
  getConsumerAuthCookieOptions,
  getConsumerCsrfTokenCookieKey,
  getConsumerCsrfTokenCookieKeysForRead,
  getCookieClearOptions,
  getCsrfCookieOptions,
  getConsumerAccessTokenCookieKeysForRead,
  getConsumerGoogleSignupSessionCookieKeysForRead,
  getConsumerRefreshTokenCookieKeysForRead,
  getConsumerDeviceCookieKeysForRead,
  getGoogleOAuthStateCookieKeysForRead,
  getOAuthStateCookieOptions,
  type OAuthCookieRuntime,
} from '@remoola/api-types';

function isSecureRequest(request: Request): boolean {
  const forwardedProto = request.headers.get(`x-forwarded-proto`);
  return new URL(request.url).protocol === `https:` || forwardedProto?.split(`,`)[0]?.trim() === `https`;
}

export function getConsumerCookieRuntime(request: Request): OAuthCookieRuntime {
  return {
    isProduction: process.env.NODE_ENV === `production`,
    isVercel: process.env.VERCEL === `1`,
    cookieSecure: process.env.COOKIE_SECURE === `true`,
    isSecureRequest: isSecureRequest(request),
  };
}

export function clearConsumerAuthCookies(response: NextResponse, request: Request): void {
  const runtime = getConsumerCookieRuntime(request);
  const authClearOpts = getCookieClearOptions(getConsumerAuthCookieOptions(runtime));
  const oauthClearOpts = getCookieClearOptions(getOAuthStateCookieOptions(runtime));
  const csrfClearOpts = getCookieClearOptions(getCsrfCookieOptions(runtime));
  for (const key of getConsumerAccessTokenCookieKeysForRead()) {
    response.cookies.set(key, ``, { ...authClearOpts, maxAge: 0 });
  }
  for (const key of getConsumerRefreshTokenCookieKeysForRead()) {
    response.cookies.set(key, ``, { ...authClearOpts, maxAge: 0 });
  }
  for (const key of getConsumerDeviceCookieKeysForRead()) {
    response.cookies.set(key, ``, { ...authClearOpts, maxAge: 0 });
  }
  for (const key of getConsumerGoogleSignupSessionCookieKeysForRead()) {
    response.cookies.set(key, ``, { ...authClearOpts, maxAge: 0 });
  }
  for (const key of getGoogleOAuthStateCookieKeysForRead()) {
    response.cookies.set(key, ``, { ...oauthClearOpts, maxAge: 0 });
  }
  for (const key of getConsumerCsrfTokenCookieKeysForRead()) {
    response.cookies.set(key, ``, { ...csrfClearOpts, maxAge: 0 });
  }
}

export function getCsrfTokenFromRequest(request: Request): string | null {
  const csrfFromHeader = request.headers.get(`x-csrf-token`);
  if (csrfFromHeader) return csrfFromHeader;

  const cookie = request.headers.get(`cookie`) ?? ``;
  const runtime = getConsumerCookieRuntime(request);
  const preferredCsrfKey = getConsumerCsrfTokenCookieKey(runtime);
  const orderedCsrfKeys = [
    preferredCsrfKey,
    ...getConsumerCsrfTokenCookieKeysForRead().filter((key) => key !== preferredCsrfKey),
  ];
  for (const key of orderedCsrfKeys) {
    const match = cookie
      .split(`;`)
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${key}=`));
    if (match) {
      return match.split(`=`).slice(1).join(`=`);
    }
  }
  return null;
}
