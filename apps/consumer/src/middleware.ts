import { type NextRequest, NextResponse } from 'next/server';

import { COOKIE_KEYS } from '@remoola/api-types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const ME_URL = API_BASE ? `${API_BASE}/consumer/auth/me` : null;
const REFRESH_URL = API_BASE ? `${API_BASE}/consumer/auth/refresh-access` : null;

/** Fintech-safe: 15m access, 7d refresh (match API defaults). Set-Cookie maxAge in seconds. */
const ACCESS_MAX_AGE_SEC = 15 * 60;
const REFRESH_MAX_AGE_SEC = 7 * 24 * 60 * 60;

async function validateAccessToken(accessToken: string): Promise<boolean> {
  if (!ME_URL) return false;
  try {
    const res = await fetch(ME_URL, {
      method: `GET`,
      headers: { Cookie: `${COOKIE_KEYS.CONSUMER_ACCESS_TOKEN}=${accessToken}` },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function refreshAccess(refreshToken: string): Promise<{ accessToken?: string; refreshToken?: string } | null> {
  if (!REFRESH_URL) return null;
  try {
    const res = await fetch(REFRESH_URL, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
    return data?.accessToken ? data : null;
  } catch {
    return null;
  }
}

function setAuthCookies(res: NextResponse, accessToken: string, refreshToken: string) {
  const isProd = process.env.NODE_ENV === `production`;
  const sameSite: `lax` | `none` = isProd ? `none` : `lax`;
  const opts = {
    path: `/`,
    httpOnly: true,
    secure: isProd,
    sameSite,
  };
  res.cookies.set(COOKIE_KEYS.CONSUMER_ACCESS_TOKEN, accessToken, { ...opts, maxAge: ACCESS_MAX_AGE_SEC });
  res.cookies.set(COOKIE_KEYS.CONSUMER_REFRESH_TOKEN, refreshToken, { ...opts, maxAge: REFRESH_MAX_AGE_SEC });
}

export async function middleware(req: NextRequest) {
  const accessToken = req.cookies.get(COOKIE_KEYS.CONSUMER_ACCESS_TOKEN)?.value;
  const refreshToken = req.cookies.get(COOKIE_KEYS.CONSUMER_REFRESH_TOKEN)?.value;

  const isAuthPage = req.nextUrl.pathname.startsWith(`/login`) || req.nextUrl.pathname.startsWith(`/signup`);
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
    const valid = await validateAccessToken(accessToken);
    if (valid) return NextResponse.next();
    if (refreshToken) {
      const tokens = await refreshAccess(refreshToken);
      if (tokens?.accessToken) {
        const res = NextResponse.next();
        setAuthCookies(res, tokens.accessToken, tokens.refreshToken ?? refreshToken);
        return res;
      }
    }
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(req.nextUrl.pathname)}`, req.url));
  }

  return NextResponse.next();
}

export const config = { matcher: [`/((?!_next|favicon.ico|assets|api/.*).*)`] };
