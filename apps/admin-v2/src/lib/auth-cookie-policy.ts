import { type NextResponse } from 'next/server';

import {
  getAdminAccessTokenCookieKey,
  getAdminAccessTokenCookieKeysForRead,
  getAdminAuthCookieOptions,
  getAdminCsrfTokenCookieKey,
  getAdminCsrfTokenCookieKeysForRead,
  getAdminRefreshTokenCookieKey,
  getAdminRefreshTokenCookieKeysForRead,
  getCookieClearOptions,
  getCsrfCookieOptions,
  type AuthCookieRuntime,
} from '@remoola/api-types';

function isSecureRequest(request: Request): boolean {
  const forwardedProto = request.headers.get(`x-forwarded-proto`);
  return new URL(request.url).protocol === `https:` || forwardedProto?.split(`,`)[0]?.trim() === `https`;
}

export function getAdminV2CookieRuntime(request: Request): AuthCookieRuntime {
  return {
    isProduction: process.env.NODE_ENV === `production`,
    isVercel: process.env.VERCEL === `1`,
    cookieSecure: process.env.COOKIE_SECURE === `true` || isSecureRequest(request),
  };
}

export function clearAdminAuthCookies(response: NextResponse, request: Request): void {
  const runtime = getAdminV2CookieRuntime(request);
  const authClearOptions = getCookieClearOptions(getAdminAuthCookieOptions(runtime));
  const csrfClearOptions = getCookieClearOptions(getCsrfCookieOptions(runtime));

  for (const key of getAdminAccessTokenCookieKeysForRead()) {
    response.cookies.set(key, ``, { ...authClearOptions, maxAge: 0 });
  }
  for (const key of getAdminRefreshTokenCookieKeysForRead()) {
    response.cookies.set(key, ``, { ...authClearOptions, maxAge: 0 });
  }
  for (const key of getAdminCsrfTokenCookieKeysForRead()) {
    response.cookies.set(key, ``, { ...csrfClearOptions, maxAge: 0 });
  }
}

export function getPreferredAdminCookieValue(
  request: Request,
  kind: `access` | `refresh` | `csrf`,
): string | undefined {
  const runtime = getAdminV2CookieRuntime(request);
  const preferredKey =
    kind === `access`
      ? getAdminAccessTokenCookieKey(runtime)
      : kind === `refresh`
        ? getAdminRefreshTokenCookieKey(runtime)
        : getAdminCsrfTokenCookieKey(runtime);
  const readableKeys =
    kind === `access`
      ? getAdminAccessTokenCookieKeysForRead()
      : kind === `refresh`
        ? getAdminRefreshTokenCookieKeysForRead()
        : getAdminCsrfTokenCookieKeysForRead();

  const cookieHeader = request.headers.get(`cookie`) ?? ``;
  const orderedKeys = [preferredKey, ...readableKeys.filter((key) => key !== preferredKey)];
  for (const key of orderedKeys) {
    const match = cookieHeader
      .split(`;`)
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${key}=`));
    if (match) {
      return match.split(`=`).slice(1).join(`=`);
    }
  }
  return undefined;
}

export function getCsrfTokenFromRequest(request: Request): string | null {
  const csrfFromHeader = request.headers.get(`x-csrf-token`);
  if (csrfFromHeader) return csrfFromHeader;
  return getPreferredAdminCookieValue(request, `csrf`) ?? null;
}
