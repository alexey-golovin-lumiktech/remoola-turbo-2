import { type NextRequest, NextResponse } from 'next/server';

import {
  getAdminAccessTokenCookieKey,
  getAdminCsrfTokenCookieKey,
  getAdminRefreshTokenCookieKey,
} from '@remoola/api-types';

import { appendSetCookies, getSetCookieValues } from './lib/api-utils';
import { clearAdminAuthCookies, getAdminV2CookieRuntime, getPreferredAdminCookieValue } from './lib/auth-cookie-policy';

const REFRESH_PATH = `/api/admin-v2/auth/refresh-access`;
const ACCESS_TOKEN_EXPIRY_SKEW_MS = 5_000;

type RefreshScope = `auth_page` | `protected_page`;

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
): Promise<Response | null> {
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
    return response.ok ? response : null;
  } catch {
    return null;
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

export async function middleware(req: NextRequest) {
  const accessToken = getPreferredAdminCookieValue(req, `access`);
  const refreshToken = getPreferredAdminCookieValue(req, `refresh`);
  const csrfToken = getPreferredAdminCookieValue(req, `csrf`);

  const isAuthPage = req.nextUrl.pathname.startsWith(`/login`);
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
      const refreshResponse = await refreshAccess(req, refreshToken, csrfToken, `protected_page`);
      if (refreshResponse) {
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set(`cookie`, applySetCookieHeaders(req.headers.get(`cookie`), refreshResponse.headers));
        const response = NextResponse.next({ request: { headers: requestHeaders } });
        appendSetCookies(response.headers, refreshResponse.headers);
        return response;
      }
    }
    return loginRedirect();
  }

  if (isProtected && hasValidAccessTokenShape && accessToken) {
    if (hasPotentialAccessToken(accessToken)) {
      const probeResponse = await probeAccessSession(req, accessToken);
      if (probeResponse?.ok) {
        return NextResponse.next();
      }
    }
    if (hasValidRefreshTokenShape && refreshToken) {
      const refreshResponse = await refreshAccess(req, refreshToken, csrfToken, `protected_page`);
      if (refreshResponse) {
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set(`cookie`, applySetCookieHeaders(req.headers.get(`cookie`), refreshResponse.headers));
        const response = NextResponse.next({ request: { headers: requestHeaders } });
        appendSetCookies(response.headers, refreshResponse.headers);
        return response;
      }
    }
    return loginRedirect();
  }

  return NextResponse.next();
}

export const config = { matcher: [`/((?!_next|favicon.ico|assets|api/.*).*)`] };
