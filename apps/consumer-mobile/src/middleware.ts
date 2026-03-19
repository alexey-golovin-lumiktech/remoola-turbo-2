import { type NextRequest, NextResponse } from 'next/server';

import {
  COOKIE_KEYS,
  getConsumerAccessTokenCookieKey,
  getConsumerRefreshTokenCookieKey,
  sanitizeNextForRedirect,
} from '@remoola/api-types';

import { appendSetCookies } from './lib/api-utils';
import { getConsumerMobileCookieRuntime } from './lib/auth-cookie-policy';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const ME_URL = API_BASE ? `${API_BASE}/consumer/auth/me` : null;
const REFRESH_URL = API_BASE ? `${API_BASE}/consumer/auth/refresh` : null;
const AUTH_TELEMETRY_HEADERS_FLAG = `NEXT_PUBLIC_AUTH_TELEMETRY_HEADERS`;

type AccessTokenValidationResult = `valid` | `invalid` | `unavailable`;
type RefreshScope = `auth_page` | `protected_page`;
type RefreshOutcome = `success` | `http_error` | `network_error` | `unavailable`;

interface RefreshAttemptTelemetry {
  scope: RefreshScope;
  outcome: RefreshOutcome;
  latencyMs: number;
  statusCode?: number;
}

interface RefreshResult {
  response: Response | null;
  telemetry: RefreshAttemptTelemetry;
}

function isObviouslyInvalidCookieToken(token: string | undefined): boolean {
  if (!token) return true;
  if (token.length > 4096) return true;
  return /[\r\n;]/.test(token);
}

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
  scope: RefreshScope,
): Promise<RefreshResult> {
  if (!REFRESH_URL) {
    return {
      response: null,
      telemetry: {
        scope,
        outcome: `unavailable`,
        latencyMs: 0,
      },
    };
  }
  const startedAt = Date.now();
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
    const latencyMs = Math.max(0, Date.now() - startedAt);
    return {
      response: res.ok ? res : null,
      telemetry: {
        scope,
        outcome: res.ok ? `success` : `http_error`,
        latencyMs,
        statusCode: res.status,
      },
    };
  } catch {
    return {
      response: null,
      telemetry: {
        scope,
        outcome: `network_error`,
        latencyMs: Math.max(0, Date.now() - startedAt),
      },
    };
  }
}

function appendServerTiming(existingServerTiming: string | null, metric: string): string {
  return existingServerTiming ? `${existingServerTiming}, ${metric}` : metric;
}

function applyRefreshTelemetry(res: NextResponse, telemetry: RefreshAttemptTelemetry): NextResponse {
  const verboseTelemetryHeadersEnabled = process.env[AUTH_TELEMETRY_HEADERS_FLAG] === `true`;
  if (verboseTelemetryHeadersEnabled) {
    res.headers.set(`x-remoola-auth-refresh-attempted`, `1`);
    res.headers.set(`x-remoola-auth-refresh-scope`, telemetry.scope);
    res.headers.set(`x-remoola-auth-refresh-outcome`, telemetry.outcome);
    res.headers.set(`x-remoola-auth-refresh-latency-ms`, String(telemetry.latencyMs));
    if (typeof telemetry.statusCode === `number`) {
      res.headers.set(`x-remoola-auth-refresh-status`, String(telemetry.statusCode));
    }
    if (telemetry.latencyMs >= 3000) {
      res.headers.set(`x-remoola-auth-refresh-slow`, `1`);
    }
  }
  const metric = `auth_refresh;dur=${telemetry.latencyMs};desc="${telemetry.scope}:${telemetry.outcome}"`;
  res.headers.set(`server-timing`, appendServerTiming(res.headers.get(`server-timing`), metric));
  return res;
}

export async function middleware(req: NextRequest) {
  const runtime = getConsumerMobileCookieRuntime(req);
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
  const isProtected = !isAuthPage && !isCallback && !isLogoutRoute;
  const hasValidAccessTokenShape = !isObviouslyInvalidCookieToken(accessToken);
  const hasValidRefreshTokenShape = !isObviouslyInvalidCookieToken(refreshToken);

  if (isCallback) return NextResponse.next();

  const safeNext = (path: string) => encodeURIComponent(sanitizeNextForRedirect(path, `/dashboard`));

  if (isProtected && !hasValidAccessTokenShape) {
    return NextResponse.redirect(new URL(`/login?next=${safeNext(req.nextUrl.pathname)}`, req.url));
  }

  // Only redirect auth pages to dashboard when token is valid (avoids TOO_MANY_REDIRECTS
  // when user has expired/invalid access cookie and lands on /login)
  if (isAuthPage && hasValidAccessTokenShape && accessToken) {
    const validation = await validateAccessToken(accessToken, accessCookieKey);
    if (validation === `valid`) return NextResponse.redirect(new URL(`/dashboard`, req.url));
    if (validation === `invalid` && hasValidRefreshTokenShape && refreshToken) {
      const refreshResult = await refreshAccess(refreshToken, refreshCookieKey, { csrfToken }, `auth_page`);
      const refreshResponse = refreshResult.response;
      if (refreshResponse) {
        const res = NextResponse.redirect(new URL(`/dashboard`, req.url));
        appendSetCookies(res.headers, refreshResponse.headers);
        return applyRefreshTelemetry(res, refreshResult.telemetry);
      }
      return applyRefreshTelemetry(NextResponse.next(), refreshResult.telemetry);
    }
    // Token invalid/unavailable and refresh failed or skipped: let user stay on login page.
  }

  if (isProtected && hasValidAccessTokenShape && accessToken) {
    const validation = await validateAccessToken(accessToken, accessCookieKey);
    if (validation === `valid`) return NextResponse.next();
    if (hasValidRefreshTokenShape && refreshToken) {
      const refreshResult = await refreshAccess(refreshToken, refreshCookieKey, { csrfToken }, `protected_page`);
      const refreshResponse = refreshResult.response;
      if (refreshResponse) {
        const res = NextResponse.next();
        appendSetCookies(res.headers, refreshResponse.headers);
        return applyRefreshTelemetry(res, refreshResult.telemetry);
      }
      return applyRefreshTelemetry(
        NextResponse.redirect(new URL(`/login?next=${safeNext(req.nextUrl.pathname)}`, req.url)),
        refreshResult.telemetry,
      );
    }
    return NextResponse.redirect(new URL(`/login?next=${safeNext(req.nextUrl.pathname)}`, req.url));
  }

  return NextResponse.next();
}

export const config = { matcher: [`/((?!_next|favicon.ico|assets|api/.*).*)`] };
