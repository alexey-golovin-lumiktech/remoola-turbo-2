import { type NextRequest, NextResponse } from 'next/server';

import {
  getAdminAccessTokenCookieKey,
  getAdminCsrfTokenCookieKey,
  getAdminRefreshTokenCookieKey,
} from '@remoola/api-types';

import { appendSetCookies, getSetCookieValues } from './lib/api-utils';
import { clearAdminAuthCookies, getAdminV2CookieRuntime, getPreferredAdminCookieValue } from './lib/auth-cookie-policy';

const AUTH_TELEMETRY_HEADERS_FLAG = `NEXT_PUBLIC_AUTH_TELEMETRY_HEADERS`;
const REFRESH_PATH = `/api/admin-v2/auth/refresh-access`;
const ACCESS_TOKEN_EXPIRY_SKEW_MS = 5_000;

type RefreshScope = `auth_page` | `protected_page`;
type RefreshOutcome = `success` | `http_error` | `network_error`;

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

function isAuthPagePath(pathname: string): boolean {
  return (
    pathname.startsWith(`/login`) ||
    pathname.startsWith(`/forgot-password`) ||
    pathname.startsWith(`/reset-password`) ||
    pathname.startsWith(`/accept-invite`)
  );
}

function isObviouslyInvalidCookieToken(token: string | undefined): boolean {
  if (!token) return true;
  if (token.length > 4096) return true;
  return /[\r\n;]/.test(token);
}

function buildCookieHeader(parts: string[]): string {
  return parts.filter(Boolean).join(`; `);
}

function parseCookieHeader(header: string | null): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of (header ?? ``).split(`;`)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const separatorIndex = trimmed.indexOf(`=`);
    if (separatorIndex <= 0) continue;
    cookies.set(trimmed.slice(0, separatorIndex), trimmed.slice(separatorIndex + 1));
  }
  return cookies;
}

function applySetCookieHeaders(cookieHeader: string | null, responseHeaders: Headers): string {
  const cookies = parseCookieHeader(cookieHeader);
  for (const setCookie of getSetCookieValues(responseHeaders)) {
    const firstSegment = setCookie.split(`;`, 1)[0] ?? ``;
    const separatorIndex = firstSegment.indexOf(`=`);
    if (separatorIndex <= 0) continue;
    cookies.set(firstSegment.slice(0, separatorIndex), firstSegment.slice(separatorIndex + 1));
  }
  return Array.from(cookies.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join(`; `);
}

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, `+`).replace(/_/g, `/`);
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, `=`);
    return decodeURIComponent(
      Array.from(atob(padded), (char) => `%${char.charCodeAt(0).toString(16).padStart(2, `0`)}`).join(``),
    );
  } catch {
    return null;
  }
}

function hasPotentialAccessToken(accessToken: string): boolean {
  const parts = accessToken.split(`.`);
  if (parts.length !== 3) return false;

  const headerJson = decodeBase64Url(parts[0] ?? ``);
  const payloadJson = decodeBase64Url(parts[1] ?? ``);
  if (!headerJson || !payloadJson) return false;

  try {
    const header = JSON.parse(headerJson) as { alg?: unknown };
    const payload = JSON.parse(payloadJson) as { exp?: unknown; typ?: unknown; scope?: unknown };
    return (
      header.alg === `HS256` &&
      payload.typ === `access` &&
      payload.scope === `admin` &&
      typeof payload.exp === `number` &&
      payload.exp * 1000 > Date.now() + ACCESS_TOKEN_EXPIRY_SKEW_MS
    );
  } catch {
    return false;
  }
}

async function refreshAccess(
  req: NextRequest,
  refreshToken: string,
  csrfToken: string | undefined,
  scope: RefreshScope,
): Promise<RefreshResult> {
  const startedAt = Date.now();
  const runtime = getAdminV2CookieRuntime(req);
  const refreshCookieKey = getAdminRefreshTokenCookieKey(runtime);
  const csrfCookieKey = getAdminCsrfTokenCookieKey(runtime);
  const cookieHeader = buildCookieHeader([
    `${refreshCookieKey}=${refreshToken}`,
    csrfToken ? `${csrfCookieKey}=${csrfToken}` : ``,
  ]);
  try {
    const response = await fetch(new URL(REFRESH_PATH, req.url), {
      method: `POST`,
      headers: {
        Cookie: cookieHeader,
        origin: req.nextUrl.origin,
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        'x-refresh-scope': scope,
      },
      signal: AbortSignal.timeout(10000),
      cache: `no-store`,
    });
    const latencyMs = Math.max(0, Date.now() - startedAt);
    return {
      response: response.ok ? response : null,
      telemetry: {
        scope,
        outcome: response.ok ? `success` : `http_error`,
        latencyMs,
        statusCode: response.status,
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

async function probeAccessSession(req: NextRequest, accessToken: string): Promise<Response | null> {
  try {
    const runtime = getAdminV2CookieRuntime(req);
    const accessCookieKey = getAdminAccessTokenCookieKey(runtime);
    return await fetch(new URL(`/api/me`, req.url), {
      method: `GET`,
      headers: {
        Cookie: `${accessCookieKey}=${accessToken}`,
      },
      signal: AbortSignal.timeout(10000),
      cache: `no-store`,
    });
  } catch {
    return null;
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
  const accessToken = getPreferredAdminCookieValue(req, `access`);
  const refreshToken = getPreferredAdminCookieValue(req, `refresh`);
  const csrfToken = getPreferredAdminCookieValue(req, `csrf`);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(`x-pathname`, req.nextUrl.pathname);

  const isAuthPage = isAuthPagePath(req.nextUrl.pathname);
  const isLogoutRoute = req.nextUrl.pathname.startsWith(`/logout`);
  const isProtected = !isAuthPage && !isLogoutRoute;
  const hasValidAccessTokenShape = !isObviouslyInvalidCookieToken(accessToken);
  const hasValidRefreshTokenShape = !isObviouslyInvalidCookieToken(refreshToken);

  if (isAuthPage && hasValidAccessTokenShape && accessToken && hasPotentialAccessToken(accessToken)) {
    const probeResponse = await probeAccessSession(req, accessToken);
    if (probeResponse?.ok) {
      return NextResponse.redirect(new URL(`/overview`, req.url));
    }
  }

  const loginRedirect = () => {
    const response = NextResponse.redirect(new URL(`/login`, req.url));
    clearAdminAuthCookies(response, req);
    return response;
  };

  if (isProtected && !hasValidAccessTokenShape) {
    if (hasValidRefreshTokenShape && refreshToken) {
      const refreshResult = await refreshAccess(req, refreshToken, csrfToken, `protected_page`);
      const refreshResponse = refreshResult.response;
      if (refreshResponse) {
        requestHeaders.set(`cookie`, applySetCookieHeaders(req.headers.get(`cookie`), refreshResponse.headers));
        const response = NextResponse.next({ request: { headers: requestHeaders } });
        appendSetCookies(response.headers, refreshResponse.headers);
        return applyRefreshTelemetry(response, refreshResult.telemetry);
      }
      return applyRefreshTelemetry(loginRedirect(), refreshResult.telemetry);
    }
    return loginRedirect();
  }

  if (isProtected && hasValidAccessTokenShape && accessToken) {
    if (hasPotentialAccessToken(accessToken)) {
      const probeResponse = await probeAccessSession(req, accessToken);
      if (probeResponse?.ok) {
        return NextResponse.next({ request: { headers: requestHeaders } });
      }
    }
    if (hasValidRefreshTokenShape && refreshToken) {
      const refreshResult = await refreshAccess(req, refreshToken, csrfToken, `protected_page`);
      const refreshResponse = refreshResult.response;
      if (refreshResponse) {
        requestHeaders.set(`cookie`, applySetCookieHeaders(req.headers.get(`cookie`), refreshResponse.headers));
        const response = NextResponse.next({ request: { headers: requestHeaders } });
        appendSetCookies(response.headers, refreshResponse.headers);
        return applyRefreshTelemetry(response, refreshResult.telemetry);
      }
      return applyRefreshTelemetry(loginRedirect(), refreshResult.telemetry);
    }
    return loginRedirect();
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: [`/((?!_next|favicon.ico|assets|api/.*).*)`] };
