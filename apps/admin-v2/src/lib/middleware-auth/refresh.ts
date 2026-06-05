import { type NextRequest } from 'next/server';

import {
  getAdminAccessTokenCookieKey,
  getAdminCsrfTokenCookieKey,
  getAdminRefreshTokenCookieKey,
} from '@remoola/api-types';

import { getAdminV2CookieRuntime } from '../auth-cookie-policy';
import { type RefreshResult, type RefreshScope } from './telemetry';

const REFRESH_PATH = `/api/admin-v2/auth/refresh-access`;

function buildCookieHeader(parts: string[]): string {
  return parts.filter(Boolean).join(`; `);
}

export async function refreshAccess(
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

export async function probeAccessSession(req: NextRequest, accessToken: string): Promise<Response | null> {
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
