import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

import {
  getAdminAccessTokenCookieKey,
  getAdminCsrfTokenCookieKey,
  getAdminRefreshTokenCookieKey,
} from '@remoola/api-types';

import { middleware } from './middleware';

type MockFetch = jest.MockedFunction<typeof fetch>;

const secureRuntime = {
  isProduction: false,
  isVercel: false,
  cookieSecure: true,
} as const;

const secureAccessCookieKey = getAdminAccessTokenCookieKey(secureRuntime);
const secureRefreshCookieKey = getAdminRefreshTokenCookieKey(secureRuntime);
const secureCsrfCookieKey = getAdminCsrfTokenCookieKey(secureRuntime);

function createRequest(
  pathname: string,
  cookies: Record<string, string> = {},
  init?: { method?: string; headers?: Record<string, string>; origin?: string },
): NextRequest {
  const headers = new Headers(init?.headers);
  const cookieHeader = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join(`; `);
  if (cookieHeader) {
    headers.set(`cookie`, cookieHeader);
  }
  return new NextRequest(`${init?.origin ?? `https://example.com`}${pathname}`, {
    method: init?.method,
    headers,
  });
}

function createAccessToken(expiresInSecondsFromNow: number): string {
  const header = Buffer.from(JSON.stringify({ alg: `HS256`, typ: `JWT` })).toString(`base64url`);
  const payload = Buffer.from(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + expiresInSecondsFromNow,
      sub: `admin-1`,
      typ: `access`,
      scope: `admin`,
    }),
  ).toString(`base64url`);
  return `${header}.${payload}.signature`;
}

describe(`admin-v2 middleware refresh telemetry`, () => {
  const originalFetch = global.fetch;
  let mockFetch: MockFetch;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_AUTH_TELEMETRY_HEADERS;
    mockFetch = jest.fn() as MockFetch;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_AUTH_TELEMETRY_HEADERS;
  });

  it(`adds server-timing on protected refresh success without verbose telemetry headers by default`, async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(undefined, {
        status: 200,
        headers: {
          [`set-cookie`]: `${secureAccessCookieKey}=new-access; Path=/; HttpOnly; SameSite=Lax`,
        },
      }),
    );

    const response = await middleware(
      createRequest(`/overview`, {
        [secureRefreshCookieKey]: `valid-refresh`,
        [secureCsrfCookieKey]: `csrf-token`,
      }),
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://example.com/api/admin-v2/auth/refresh-access`);
    expect(response.headers.get(`set-cookie`)).toContain(`${secureAccessCookieKey}=new-access`);
    expect(response.headers.get(`server-timing`)).toContain(`auth_refresh;dur=`);
    expect(response.headers.get(`x-remoola-auth-refresh-attempted`)).toBeNull();
    expect(response.headers.get(`x-remoola-auth-refresh-scope`)).toBeNull();
  });

  it(`adds refresh telemetry to login redirects when protected refresh fails`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 }));

    const response = await middleware(
      createRequest(`/overview`, {
        [secureRefreshCookieKey]: `expired-refresh`,
        [secureCsrfCookieKey]: `csrf-token`,
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get(`location`)).toContain(`/login`);
    expect(response.headers.get(`server-timing`)).toContain(`protected_page:http_error`);
    expect(response.headers.get(`set-cookie`)).toContain(`${secureRefreshCookieKey}=;`);
    expect(response.headers.get(`set-cookie`)).toContain(`Max-Age=0`);
  });

  it(`emits verbose telemetry headers when the env flag is enabled`, async () => {
    process.env.NEXT_PUBLIC_AUTH_TELEMETRY_HEADERS = `true`;
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 })).mockResolvedValueOnce(
      new Response(undefined, {
        status: 200,
        headers: {
          [`set-cookie`]: `${secureAccessCookieKey}=new-access; Path=/; HttpOnly; SameSite=Lax`,
        },
      }),
    );

    const response = await middleware(
      createRequest(`/overview`, {
        [secureAccessCookieKey]: createAccessToken(3600),
        [secureRefreshCookieKey]: `valid-refresh`,
        [secureCsrfCookieKey]: `csrf-token`,
      }),
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://example.com/api/me`);
    expect(String(mockFetch.mock.calls[1]?.[0])).toBe(`https://example.com/api/admin-v2/auth/refresh-access`);
    expect(response.headers.get(`x-remoola-auth-refresh-attempted`)).toBe(`1`);
    expect(response.headers.get(`x-remoola-auth-refresh-scope`)).toBe(`protected_page`);
    expect(response.headers.get(`x-remoola-auth-refresh-outcome`)).toBe(`success`);
    expect(response.headers.get(`x-remoola-auth-refresh-status`)).toBe(`200`);
    expect(response.headers.get(`x-remoola-auth-refresh-latency-ms`)).not.toBeNull();
  });
});
