import { type NextRequest, type NextResponse } from 'next/server';

import {
  getApiV2ConsumerAccessTokenCookieKey,
  getApiV2ConsumerAccessTokenCookieKeysForRead,
  getApiV2ConsumerCsrfTokenCookieKeyForRuntime,
  getApiV2ConsumerCsrfTokenCookieKeysForRead,
  getApiV2ConsumerRefreshTokenCookieKey,
  getApiV2ConsumerRefreshTokenCookieKeysForRead,
  type OAuthCookieRuntime,
} from '@remoola/api-types';

import { appendSetCookies, getSetCookieValues } from '../api-utils';
import { getConsumerCssGridCookieRuntime } from '../auth-cookie-policy';
import { parseCookieHeader } from '../cookie-utils';
import {
  clearAuthCookiesAndContinue,
  continueWithRequestHeaders,
  createDashboardRedirect,
  createProtectedActionFailureResponse,
  type MiddlewareRequestPolicy,
} from './request-policy';
import { type RefreshAttemptTelemetry, type RefreshOutcome, type RefreshScope } from './telemetry';
import { getPreferredCookieValue, hasPotentialAccessToken, isObviouslyInvalidCookieToken } from './token-shape';

const REFRESH_PATH = `/api/consumer/auth/refresh`;

interface MiddlewareSessionState {
  runtime: OAuthCookieRuntime;
  accessCookieKey: string;
  refreshCookieKey: string;
  csrfCookieKey: string;
  accessToken?: string;
  refreshToken?: string;
  csrfToken?: string;
  hasValidAccessTokenShape: boolean;
  hasValidRefreshTokenShape: boolean;
}

interface RefreshResult {
  response: Response | null;
  telemetry: RefreshAttemptTelemetry;
}

interface SessionHandlingResult {
  response: NextResponse;
  telemetry?: RefreshAttemptTelemetry;
}

export function readMiddlewareSessionState(req: NextRequest): MiddlewareSessionState {
  const runtime = getConsumerCssGridCookieRuntime(req);
  const accessCookieKey = getApiV2ConsumerAccessTokenCookieKey(runtime);
  const refreshCookieKey = getApiV2ConsumerRefreshTokenCookieKey(runtime);
  const csrfCookieKey = getApiV2ConsumerCsrfTokenCookieKeyForRuntime(runtime);
  const accessToken = getPreferredCookieValue(req, accessCookieKey, getApiV2ConsumerAccessTokenCookieKeysForRead());
  const refreshToken = getPreferredCookieValue(req, refreshCookieKey, getApiV2ConsumerRefreshTokenCookieKeysForRead());
  const csrfToken = getPreferredCookieValue(req, csrfCookieKey, getApiV2ConsumerCsrfTokenCookieKeysForRead());

  return {
    runtime,
    accessCookieKey,
    refreshCookieKey,
    csrfCookieKey,
    accessToken,
    refreshToken,
    csrfToken,
    hasValidAccessTokenShape: !isObviouslyInvalidCookieToken(accessToken),
    hasValidRefreshTokenShape: !isObviouslyInvalidCookieToken(refreshToken),
  };
}

function buildCookieHeader(parts: string[]): string {
  return parts.filter(Boolean).join(`; `);
}

async function refreshAccess(
  req: NextRequest,
  state: MiddlewareSessionState,
  scope: RefreshScope,
): Promise<RefreshResult> {
  const startedAt = Date.now();

  if (!state.refreshToken) {
    return {
      response: null,
      telemetry: {
        scope,
        outcome: `unavailable`,
        latencyMs: 0,
      },
    };
  }

  try {
    const runtimeCsrfCookieKey = getApiV2ConsumerCsrfTokenCookieKeyForRuntime(state.runtime);
    const cookieHeader = buildCookieHeader([
      `${state.refreshCookieKey}=${state.refreshToken}`,
      state.csrfToken ? `${runtimeCsrfCookieKey}=${state.csrfToken}` : ``,
    ]);

    const response = await fetch(new URL(REFRESH_PATH, req.url), {
      method: `POST`,
      headers: {
        Cookie: cookieHeader,
        origin: req.nextUrl.origin,
        ...(state.csrfToken ? { 'x-csrf-token': state.csrfToken } : {}),
      },
      signal: AbortSignal.timeout(10000),
      cache: `no-store`,
    });

    const outcome: RefreshOutcome = response.ok ? `success` : `http_error`;
    return {
      response: response.ok ? response : null,
      telemetry: {
        scope,
        outcome,
        latencyMs: Math.max(0, Date.now() - startedAt),
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

async function probeAccessSession(req: NextRequest, state: MiddlewareSessionState): Promise<Response | null> {
  if (!state.accessToken) return null;

  try {
    return await fetch(new URL(`/api/me`, req.url), {
      method: `GET`,
      headers: {
        Cookie: `${state.accessCookieKey}=${state.accessToken}`,
      },
      signal: AbortSignal.timeout(10000),
      cache: `no-store`,
    });
  } catch {
    return null;
  }
}

export function mergeRequestCookiesWithResponse(req: NextRequest, responseHeaders: Headers): string {
  const cookies = parseCookieHeader(req.headers.get(`cookie`));

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

function applySuccessfulRefreshToProtectedResponse(req: NextRequest, refreshResponse: Response): NextResponse {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(`cookie`, mergeRequestCookiesWithResponse(req, refreshResponse.headers));

  const response = continueWithRequestHeaders(requestHeaders);
  appendSetCookies(response.headers, refreshResponse.headers);
  return response;
}

export async function handleAuthPageSession(
  req: NextRequest,
  state: MiddlewareSessionState,
): Promise<SessionHandlingResult> {
  if (!state.hasValidAccessTokenShape) {
    if (state.hasValidRefreshTokenShape && state.refreshToken) {
      const refreshResult = await refreshAccess(req, state, `auth_page`);
      if (refreshResult.response) {
        const response = createDashboardRedirect(req);
        appendSetCookies(response.headers, refreshResult.response.headers);
        return { response, telemetry: refreshResult.telemetry };
      }

      return {
        response: clearAuthCookiesAndContinue(req),
        telemetry: refreshResult.telemetry,
      };
    }

    return { response: continueWithRequestHeaders() };
  }

  if (state.accessToken && hasPotentialAccessToken(state.accessToken)) {
    const probeResponse = await probeAccessSession(req, state);
    if (probeResponse?.ok) {
      return { response: createDashboardRedirect(req) };
    }
  }

  if (state.hasValidRefreshTokenShape && state.refreshToken) {
    const refreshResult = await refreshAccess(req, state, `auth_page`);
    if (refreshResult.response) {
      const response = createDashboardRedirect(req);
      appendSetCookies(response.headers, refreshResult.response.headers);
      return { response, telemetry: refreshResult.telemetry };
    }

    return {
      response: clearAuthCookiesAndContinue(req),
      telemetry: refreshResult.telemetry,
    };
  }

  return { response: continueWithRequestHeaders() };
}

export async function handleProtectedPageSession(
  req: NextRequest,
  policy: MiddlewareRequestPolicy,
  state: MiddlewareSessionState,
): Promise<SessionHandlingResult> {
  if (!state.hasValidAccessTokenShape) {
    if (state.hasValidRefreshTokenShape && state.refreshToken) {
      const refreshResult = await refreshAccess(req, state, `protected_page`);
      if (refreshResult.response) {
        return {
          response: applySuccessfulRefreshToProtectedResponse(req, refreshResult.response),
          telemetry: refreshResult.telemetry,
        };
      }

      return {
        response: createProtectedActionFailureResponse(req, policy, { sessionExpired: true }),
        telemetry: refreshResult.telemetry,
      };
    }

    return {
      response: createProtectedActionFailureResponse(req, policy),
    };
  }

  if (state.accessToken && hasPotentialAccessToken(state.accessToken)) {
    const probeResponse = await probeAccessSession(req, state);
    if (probeResponse?.ok) {
      return { response: continueWithRequestHeaders() };
    }
  }

  if (state.hasValidRefreshTokenShape && state.refreshToken) {
    const refreshResult = await refreshAccess(req, state, `protected_page`);
    if (refreshResult.response) {
      return {
        response: applySuccessfulRefreshToProtectedResponse(req, refreshResult.response),
        telemetry: refreshResult.telemetry,
      };
    }

    return {
      response: createProtectedActionFailureResponse(req, policy, { sessionExpired: true }),
      telemetry: refreshResult.telemetry,
    };
  }

  return {
    response: createProtectedActionFailureResponse(req, policy),
  };
}
