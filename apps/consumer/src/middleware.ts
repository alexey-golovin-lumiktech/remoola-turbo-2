import { type NextRequest, NextResponse } from 'next/server';

import {
  SESSION_EXPIRED_QUERY,
  getConsumerAccessTokenCookieKey,
  getConsumerAccessTokenCookieKeysForRead,
  getConsumerCsrfTokenCookieKey,
  getConsumerCsrfTokenCookieKeysForRead,
  getConsumerRefreshTokenCookieKey,
  getConsumerRefreshTokenCookieKeysForRead,
  sanitizeNextForRedirect,
} from '@remoola/api-types';

import { appendSetCookies, getSetCookieValues } from './lib/api-utils';
import { getConsumerCookieRuntime } from './lib/auth-cookie-policy';

const AUTH_TELEMETRY_HEADERS_FLAG = `NEXT_PUBLIC_AUTH_TELEMETRY_HEADERS`;
const REFRESH_PATH = `/api/consumer/auth/refresh`;
const ACCESS_TOKEN_EXPIRY_SKEW_MS = 5_000;

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

function getPreferredCookieValue(
  req: NextRequest,
  preferredKey: string,
  readableKeys: readonly string[],
): string | undefined {
  const orderedKeys = [preferredKey, ...readableKeys.filter((key) => key !== preferredKey)];
  for (const key of orderedKeys) {
    const value = req.cookies.get(key)?.value;
    if (value) return value;
  }
  return undefined;
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
    const payload = JSON.parse(payloadJson) as { exp?: unknown; typ?: unknown };
    return (
      header.alg === `HS256` &&
      payload.typ === `access` &&
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
  refreshCookieKey: string,
  reqCookies: { csrfToken?: string },
  scope: RefreshScope,
): Promise<RefreshResult> {
  const startedAt = Date.now();
  try {
    const runtime = getConsumerCookieRuntime(req);
    const csrfToken = reqCookies.csrfToken;
    const csrfCookieKey = getConsumerCsrfTokenCookieKey(runtime);
    const cookieHeader = buildCookieHeader([
      `${refreshCookieKey}=${refreshToken}`,
      csrfToken ? `${csrfCookieKey}=${csrfToken}` : ``,
    ]);
    const res = await fetch(new URL(REFRESH_PATH, req.url), {
      method: `POST`,
      headers: {
        Cookie: cookieHeader,
        origin: req.nextUrl.origin,
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

async function probeAccessSession(
  req: NextRequest,
  accessToken: string,
  accessCookieKey: string,
): Promise<Response | null> {
  try {
    return await fetch(new URL(`/api/me`, req.url), {
      method: `GET`,
      headers: {
        Cookie: `${accessCookieKey}=${accessToken}`,
        origin: req.nextUrl.origin,
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
  const runtime = getConsumerCookieRuntime(req);
  const accessCookieKey = getConsumerAccessTokenCookieKey(runtime);
  const refreshCookieKey = getConsumerRefreshTokenCookieKey(runtime);
  const csrfCookieKey = getConsumerCsrfTokenCookieKey(runtime);
  const accessToken = getPreferredCookieValue(req, accessCookieKey, getConsumerAccessTokenCookieKeysForRead());
  const refreshToken = getPreferredCookieValue(req, refreshCookieKey, getConsumerRefreshTokenCookieKeysForRead());
  const csrfToken = getPreferredCookieValue(req, csrfCookieKey, getConsumerCsrfTokenCookieKeysForRead());

  const isAuthPage =
    req.nextUrl.pathname.startsWith(`/login`) ||
    req.nextUrl.pathname.startsWith(`/forgot-password`) ||
    req.nextUrl.pathname.startsWith(`/signup`);
  const isCallback = req.nextUrl.pathname.startsWith(`/auth/callback`);
  const isLogoutRoute = req.nextUrl.pathname.startsWith(`/logout`);
  const isProtected = !isAuthPage && !isCallback && !isLogoutRoute;
  const isServerActionRequest = req.method === `POST` && req.headers.has(`next-action`);
  const hasValidAccessTokenShape = !isObviouslyInvalidCookieToken(accessToken);
  const hasValidRefreshTokenShape = !isObviouslyInvalidCookieToken(refreshToken);

  if (isCallback) return NextResponse.next();

  const safeNext = (path: string) => encodeURIComponent(sanitizeNextForRedirect(path, `/dashboard`));
  const loginRedirect = (sessionExpired = false) => {
    const loginUrl = new URL(`/login?next=${safeNext(req.nextUrl.pathname)}`, req.url);
    if (sessionExpired) {
      loginUrl.searchParams.set(SESSION_EXPIRED_QUERY, `1`);
    }
    return NextResponse.redirect(loginUrl);
  };
  const redirectToDashboard = () => NextResponse.redirect(new URL(`/dashboard`, req.url));
  const protectedActionFailure = (sessionExpired = false) =>
    isServerActionRequest ? NextResponse.next() : loginRedirect(sessionExpired);
  const continueWithHeaders = (headers?: Headers) =>
    headers ? NextResponse.next({ request: { headers } }) : NextResponse.next();

  if (isProtected && !hasValidAccessTokenShape) {
    if (hasValidRefreshTokenShape && refreshToken) {
      const refreshResult = await refreshAccess(req, refreshToken, refreshCookieKey, { csrfToken }, `protected_page`);
      const refreshResponse = refreshResult.response;
      if (refreshResponse) {
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set(`cookie`, applySetCookieHeaders(req.headers.get(`cookie`), refreshResponse.headers));
        const res = continueWithHeaders(requestHeaders);
        appendSetCookies(res.headers, refreshResponse.headers);
        return applyRefreshTelemetry(res, refreshResult.telemetry);
      }
      return applyRefreshTelemetry(protectedActionFailure(true), refreshResult.telemetry);
    }
    return protectedActionFailure();
  }

  if (isAuthPage && !hasValidAccessTokenShape && hasValidRefreshTokenShape && refreshToken) {
    const refreshResult = await refreshAccess(req, refreshToken, refreshCookieKey, { csrfToken }, `auth_page`);
    const refreshResponse = refreshResult.response;
    if (refreshResponse) {
      const res = redirectToDashboard();
      appendSetCookies(res.headers, refreshResponse.headers);
      return applyRefreshTelemetry(res, refreshResult.telemetry);
    }
    return applyRefreshTelemetry(NextResponse.next(), refreshResult.telemetry);
  }

  if (isAuthPage && hasValidAccessTokenShape && accessToken) {
    if (hasPotentialAccessToken(accessToken)) {
      const probeResponse = await probeAccessSession(req, accessToken, accessCookieKey);
      if (probeResponse?.ok) return NextResponse.redirect(new URL(`/dashboard`, req.url));
    }
    if (hasValidRefreshTokenShape && refreshToken) {
      const refreshResult = await refreshAccess(req, refreshToken, refreshCookieKey, { csrfToken }, `auth_page`);
      const refreshResponse = refreshResult.response;
      if (refreshResponse) {
        const res = redirectToDashboard();
        appendSetCookies(res.headers, refreshResponse.headers);
        return applyRefreshTelemetry(res, refreshResult.telemetry);
      }
      return applyRefreshTelemetry(NextResponse.next(), refreshResult.telemetry);
    }
    return NextResponse.next();
  }

  if (isProtected && hasValidAccessTokenShape && accessToken) {
    if (hasPotentialAccessToken(accessToken)) {
      const probeResponse = await probeAccessSession(req, accessToken, accessCookieKey);
      if (probeResponse?.ok) return NextResponse.next();
    }
    if (hasValidRefreshTokenShape && refreshToken) {
      const refreshResult = await refreshAccess(req, refreshToken, refreshCookieKey, { csrfToken }, `protected_page`);
      const refreshResponse = refreshResult.response;
      if (refreshResponse) {
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set(`cookie`, applySetCookieHeaders(req.headers.get(`cookie`), refreshResponse.headers));
        const res = continueWithHeaders(requestHeaders);
        appendSetCookies(res.headers, refreshResponse.headers);
        return applyRefreshTelemetry(res, refreshResult.telemetry);
      }
      return applyRefreshTelemetry(protectedActionFailure(true), refreshResult.telemetry);
    }
    return protectedActionFailure();
  }

  return NextResponse.next();
}

export const config = { matcher: [`/((?!_next|favicon.ico|assets|api/.*).*)`] };
