import { type NextRequest, NextResponse } from 'next/server';

import { COOKIE_KEYS, getConsumerAccessTokenCookieKey, getConsumerRefreshTokenCookieKey } from '@remoola/api-types';

import { appendSetCookies } from './lib/api-utils';
import { getConsumerCookieRuntime } from './lib/auth-cookie-policy';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const ME_URL = API_BASE ? `${API_BASE}/consumer/auth/me` : null;
const REFRESH_URL = API_BASE ? `${API_BASE}/consumer/auth/refresh` : null;

async function validateAccessToken(accessToken: string, accessCookieKey: string): Promise<boolean> {
  if (!ME_URL) return false;
  try {
    const res = await fetch(ME_URL, {
      method: `GET`,
      headers: { Cookie: `${accessCookieKey}=${accessToken}` },
      signal: AbortSignal.timeout(5000),
      cache: `no-store`,
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function refreshAccess(
  refreshToken: string,
  refreshCookieKey: string,
  reqCookies: { csrfToken?: string },
): Promise<Response | null> {
  if (!REFRESH_URL) return null;
  try {
    const csrfToken = reqCookies.csrfToken;
    const cookieHeader = `${refreshCookieKey}=${refreshToken}; ${COOKIE_KEYS.CSRF_TOKEN}=${csrfToken ?? ``}`;
    const res = await fetch(REFRESH_URL, {
      method: `POST`,
      headers: {
        Cookie: cookieHeader,
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      },
      signal: AbortSignal.timeout(10000),
      cache: `no-store`,
    });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const runtime = getConsumerCookieRuntime(req);
  const accessCookieKey = getConsumerAccessTokenCookieKey(runtime);
  const refreshCookieKey = getConsumerRefreshTokenCookieKey(runtime);
  const accessToken = req.cookies.get(accessCookieKey)?.value;
  const refreshToken = req.cookies.get(refreshCookieKey)?.value;
  const csrfToken = req.cookies.get(COOKIE_KEYS.CSRF_TOKEN)?.value;

  const isAuthPage =
    req.nextUrl.pathname.startsWith(`/login`) ||
    req.nextUrl.pathname.startsWith(`/signup`) ||
    req.nextUrl.pathname.startsWith(`/forgot-password`);
  const isCallback = req.nextUrl.pathname.startsWith(`/auth/callback`);
  const isProtected = !isAuthPage;

  if (isCallback) return NextResponse.next();

  if (isProtected && !accessToken) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(req.nextUrl.pathname)}`, req.url));
  }

  if (isAuthPage && accessToken) {
    return NextResponse.redirect(new URL(`/dashboard`, req.url));
  }

  if (isProtected && accessToken) {
    const valid = await validateAccessToken(accessToken, accessCookieKey);
    if (valid) return NextResponse.next();
    if (refreshToken) {
      const refreshResponse = await refreshAccess(refreshToken, refreshCookieKey, { csrfToken });
      if (refreshResponse) {
        const res = NextResponse.next();
        appendSetCookies(res.headers, refreshResponse.headers);
        return res;
      }
    }
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(req.nextUrl.pathname)}`, req.url));
  }

  return NextResponse.next();
}

export const config = { matcher: [`/((?!_next|favicon.ico|assets|api/.*).*)`] };
