import { type NextRequest, NextResponse } from 'next/server';

import {
  COOKIE_KEYS,
  getConsumerAccessTokenCookieKey,
  getConsumerRefreshTokenCookieKey,
  sanitizeNextForRedirect,
} from '@remoola/api-types';

import { appendSetCookies } from './lib/api-utils';
import { getConsumerCookieRuntime } from './lib/auth-cookie-policy';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const ME_URL = API_BASE ? `${API_BASE}/consumer/auth/me` : null;
const REFRESH_URL = API_BASE ? `${API_BASE}/consumer/auth/refresh` : null;
type AccessTokenValidationResult = `valid` | `invalid` | `unavailable`;

async function validateAccessToken(accessToken: string, accessCookieKey: string): Promise<AccessTokenValidationResult> {
  if (!ME_URL) return `unavailable`;
  try {
    const res = await fetch(ME_URL, {
      method: `GET`,
      headers: { Cookie: `${accessCookieKey}=${accessToken}` },
      signal: AbortSignal.timeout(5000),
      cache: `no-store`,
    });
    return res.ok ? `valid` : `invalid`;
  } catch {
    return `unavailable`;
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

function isObviouslyInvalidCookieToken(token: string | undefined): boolean {
  if (!token) return true;
  if (token.length > 4096) return true;
  return /[\r\n;]/.test(token);
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
  const isLogoutRoute = req.nextUrl.pathname.startsWith(`/logout`);
  const isProtected = !isAuthPage && !isLogoutRoute;
  const hasValidAccessTokenShape = !isObviouslyInvalidCookieToken(accessToken);
  const hasValidRefreshTokenShape = !isObviouslyInvalidCookieToken(refreshToken);

  const safeNext = (path: string) => encodeURIComponent(sanitizeNextForRedirect(path, `/dashboard`));

  if (isCallback) return NextResponse.next();

  if (isProtected && !hasValidAccessTokenShape) {
    return NextResponse.redirect(new URL(`/login?next=${safeNext(req.nextUrl.pathname)}`, req.url));
  }

  if (isAuthPage && hasValidAccessTokenShape && accessToken) {
    const validation = await validateAccessToken(accessToken, accessCookieKey);
    if (validation === `valid`) return NextResponse.redirect(new URL(`/dashboard`, req.url));
    if (validation === `invalid` && hasValidRefreshTokenShape && refreshToken) {
      const refreshResponse = await refreshAccess(refreshToken, refreshCookieKey, { csrfToken });
      if (refreshResponse) {
        const res = NextResponse.redirect(new URL(`/dashboard`, req.url));
        appendSetCookies(res.headers, refreshResponse.headers);
        return res;
      }
    }
    // Validation unavailable or invalid+refresh failed: keep user on auth page.
    return NextResponse.next();
  }

  if (isProtected && hasValidAccessTokenShape && accessToken) {
    // For protected pages, trust a well-shaped access cookie and let the app's
    // existing 401/refresh path handle expired sessions without an eager /auth/me call.
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = { matcher: [`/((?!_next|favicon.ico|assets|api/.*).*)`] };
