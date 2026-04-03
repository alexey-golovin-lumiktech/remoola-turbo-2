import { NextResponse, type NextRequest } from 'next/server';

import { getAdminAuthCookieOptions, getCsrfCookieOptions, sanitizeNextForRedirect } from '@remoola/api-types';

import {
  getAdminAccessCookieKey,
  getAdminAccessCookieKeysForRead,
  getAdminCsrfCookieKey,
  getAdminCsrfCookieKeysForRead,
  getAdminRefreshCookieKey,
  getAdminRefreshCookieKeysForRead,
} from './lib/auth-cookie-policy';

const PUBLIC_PATHS = [`/login`, `/api/auth/login`];
const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const JWT_ACCESS_EXPIRES_SECONDS = 900;
const JWT_REFRESH_EXPIRES_SECONDS = 604800;

// Token validation cache to avoid repeated backend calls
const tokenCache = new Map<string, { valid: boolean; expires: number }>();
const TOKEN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const TOKEN_CACHE_MAX_SIZE = 1000;

function getAdminCookieOptions() {
  return getAdminAuthCookieOptions({
    isProduction: process.env.NODE_ENV === `production`,
    isVercel: process.env.VERCEL === `1`,
    cookieSecure: process.env.COOKIE_SECURE === `true`,
  });
}

function getCsrfCookieOptionsForRequest(req: NextRequest) {
  return getCsrfCookieOptions({
    isProduction: process.env.NODE_ENV === `production`,
    isVercel: process.env.VERCEL === `1`,
    cookieSecure: process.env.COOKIE_SECURE === `true`,
    isSecureRequest: req.nextUrl.protocol === `https:`,
  });
}

async function validateToken(token: string): Promise<boolean> {
  // Check cache first
  const cached = tokenCache.get(token);
  if (cached && Date.now() < cached.expires) {
    return cached.valid;
  }

  try {
    // Create cookie header to send to backend
    const cookieHeader = `${getAdminAccessCookieKey()}=${token}`;

    const response = await fetch(`${NEXT_PUBLIC_API_BASE_URL}/admin/auth/me`, {
      method: `GET`,
      headers: {
        'Content-Type': `application/json`,
        Cookie: cookieHeader,
      },
      credentials: `include`,
      cache: `no-store`,
      signal: AbortSignal.timeout(5000),
    });

    const isValid = response.ok;
    tokenCache.set(token, { valid: isValid, expires: Date.now() + TOKEN_CACHE_TTL });

    // Evict expired or oldest entry when cache is over the size cap
    if (tokenCache.size > TOKEN_CACHE_MAX_SIZE) {
      const now = Date.now();
      let evicted = false;
      for (const [k, v] of tokenCache) {
        if (now >= v.expires) {
          tokenCache.delete(k);
          evicted = true;
          break;
        }
      }
      if (!evicted) {
        tokenCache.delete(tokenCache.keys().next().value!);
      }
    }

    return isValid;
  } catch {
    // Do not log error object (may contain headers/cookies)
    return false;
  }
}

function getSetCookieValues(headers: Headers): string[] {
  const extendedHeaders = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof extendedHeaders.getSetCookie === `function`) {
    return extendedHeaders.getSetCookie();
  }
  const value = headers.get(`set-cookie`);
  return value ? [value] : [];
}

function readCookieValueFromSetCookie(setCookies: readonly string[], cookieName: string): string | undefined {
  const escapedName = cookieName.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`);
  const pattern = new RegExp(`(?:^|,\\s*)${escapedName}=([^;]+)`);
  for (const line of setCookies) {
    const match = pattern.exec(line);
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  }
  return undefined;
}

async function refreshToken(
  refreshToken: string,
  csrfToken: string,
  requestOrigin: string,
): Promise<{ setCookies: string[]; success: boolean }> {
  try {
    const refreshCookieKey = getAdminRefreshCookieKey();
    const csrfCookieKey = getAdminCsrfCookieKey();
    const response = await fetch(`${NEXT_PUBLIC_API_BASE_URL}/admin/auth/refresh-access`, {
      method: `POST`,
      headers: {
        Cookie: `${refreshCookieKey}=${refreshToken}; ${csrfCookieKey}=${csrfToken}`,
        'x-csrf-token': csrfToken,
        origin: requestOrigin,
      },
      credentials: `include`,
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { setCookies: [], success: false };
    }

    return {
      setCookies: getSetCookieValues(response.headers),
      success: true,
    };
  } catch {
    return { setCookies: [], success: false };
  }
}

function readCookieValue(req: NextRequest, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = req.cookies.get(key)?.value;
    if (value) return value;
  }
  return undefined;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Get tokens from cookies
  const accessToken = readCookieValue(req, getAdminAccessCookieKeysForRead());
  const refreshTokenValue = readCookieValue(req, getAdminRefreshCookieKeysForRead());
  const csrfToken = readCookieValue(req, getAdminCsrfCookieKeysForRead());

  // For protected routes, require authentication
  if (!pathname.startsWith(`/api/`)) {
    if (!accessToken) {
      return redirectToLogin(req);
    }

    // Validate access token
    const isValidToken = await validateToken(accessToken);
    if (!isValidToken) {
      // Try to refresh token
      if (refreshTokenValue && csrfToken) {
        const refreshResult = await refreshToken(refreshTokenValue, csrfToken, req.nextUrl.origin);
        if (refreshResult.success) {
          const accessCookieKey = getAdminAccessCookieKey();
          const accessTokenFromRefresh = readCookieValueFromSetCookie(refreshResult.setCookies, accessCookieKey);

          if (!accessTokenFromRefresh) {
            return redirectToLogin(req);
          }

          const response = NextResponse.next();
          const cookieOptions = getAdminCookieOptions();
          const refreshCookieKey = getAdminRefreshCookieKey();
          const csrfCookieKey = getAdminCsrfCookieKey();
          const refreshTokenFromRefresh = readCookieValueFromSetCookie(refreshResult.setCookies, refreshCookieKey);
          const csrfTokenFromRefresh = readCookieValueFromSetCookie(refreshResult.setCookies, csrfCookieKey);
          response.cookies.set(accessCookieKey, accessTokenFromRefresh, {
            ...cookieOptions,
            maxAge: JWT_ACCESS_EXPIRES_SECONDS,
          });
          if (refreshTokenFromRefresh) {
            response.cookies.set(refreshCookieKey, refreshTokenFromRefresh, {
              ...cookieOptions,
              maxAge: JWT_REFRESH_EXPIRES_SECONDS,
            });
          }
          if (csrfTokenFromRefresh) {
            response.cookies.set(csrfCookieKey, csrfTokenFromRefresh, {
              ...getCsrfCookieOptionsForRequest(req),
              maxAge: JWT_REFRESH_EXPIRES_SECONDS,
            });
          }
          return response;
        }
      }

      // Token refresh failed, redirect to login
      return redirectToLogin(req);
    }

    // Authenticated user accessing root path - redirect to dashboard
    if (pathname === `/`) {
      const url = req.nextUrl.clone();
      url.pathname = `/dashboard`;
      return NextResponse.redirect(url);
    }
  }

  // For API routes, just check if token exists (detailed validation happens in API handlers)
  if (pathname.startsWith(`/api/`) && !accessToken) {
    return NextResponse.json({ error: `Authentication required`, code: `AUTH_REQUIRED` }, { status: 401 });
  }

  return NextResponse.next();
}

function redirectToLogin(req: NextRequest): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = `/login`;
  const intended = req.nextUrl.pathname === `/` ? `/dashboard` : req.nextUrl.pathname;
  url.searchParams.set(`next`, sanitizeNextForRedirect(intended, `/dashboard`));
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    `/((?!_next/static|_next/image|favicon.ico).*)`,
  ],
};
