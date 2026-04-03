import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

import {
  COOKIE_KEYS,
  getConsumerMobileAccessTokenCookieKey,
  getConsumerMobileRefreshTokenCookieKey,
  sanitizeNextForRedirect,
} from '@remoola/api-types';

import { middleware } from './middleware';

type MockFetch = jest.MockedFunction<typeof fetch>;

const secureAccessCookieKey = getConsumerMobileAccessTokenCookieKey({
  isProduction: false,
  isVercel: false,
  cookieSecure: false,
  isSecureRequest: true,
});
const localAccessCookieKey = getConsumerMobileAccessTokenCookieKey({
  isProduction: false,
  isVercel: false,
  cookieSecure: false,
  isSecureRequest: false,
});
const secureRefreshCookieKey = getConsumerMobileRefreshTokenCookieKey({
  isProduction: false,
  isVercel: false,
  cookieSecure: false,
  isSecureRequest: true,
});
const localRefreshCookieKey = getConsumerMobileRefreshTokenCookieKey({
  isProduction: false,
  isVercel: false,
  cookieSecure: false,
  isSecureRequest: false,
});
const csrfCookieKey = COOKIE_KEYS.CONSUMER_MOBILE_CSRF_TOKEN;

function createRequest(
  pathname: string,
  cookies: Record<string, string> = {},
  init?: { method?: string; headers?: Record<string, string>; origin?: string },
): NextRequest {
  const req = new NextRequest(`${init?.origin ?? `https://example.com`}${pathname}`, {
    method: init?.method,
    headers: init?.headers,
  });
  for (const [k, v] of Object.entries(cookies)) {
    req.cookies.set(k, v);
  }
  return req;
}

function createAccessToken(expiresInSecondsFromNow: number): string {
  const header = Buffer.from(JSON.stringify({ alg: `HS256`, typ: `JWT` })).toString(`base64url`);
  const payload = Buffer.from(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + expiresInSecondsFromNow,
      sub: `consumer-1`,
      typ: `access`,
    }),
  ).toString(`base64url`);
  return `${header}.${payload}.signature`;
}

describe(`consumer-mobile middleware auth-session behavior`, () => {
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

  it(`redirects protected pages to login when no auth cookies are present`, async () => {
    const response = await middleware(createRequest(`/dashboard`));

    expect(response.status).toBe(307);
    expect(response.headers.get(`location`)).toContain(`/login?next=%2Fdashboard`);
    expect(mockFetch).toHaveBeenCalledTimes(0);
  });

  it(`refreshes protected pages when the access cookie is missing but refresh is still valid`, async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(undefined, {
        status: 200,
        headers: {
          [`set-cookie`]: `${secureAccessCookieKey}=new-a; Path=/; HttpOnly; SameSite=Lax`,
        },
      }),
    );

    const response = await middleware(
      createRequest(`/settings`, {
        [secureRefreshCookieKey]: `valid-r`,
        [csrfCookieKey]: `csrf`,
      }),
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://example.com/api/consumer/auth/refresh`);
    expect(response.headers.get(`set-cookie`)).toContain(`${secureAccessCookieKey}=new-a`);
    expect(response.headers.get(`server-timing`)).toContain(`auth_refresh;dur=`);
  });

  it(`prefetch requests skip auth probing and refresh`, async () => {
    const response = await middleware(
      createRequest(
        `/dashboard`,
        {
          [secureRefreshCookieKey]: `valid-r`,
          [csrfCookieKey]: `csrf`,
        },
        {
          headers: { purpose: `prefetch` },
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(0);
  });

  it(`redirects auth pages to dashboard when a refresh cookie can restore the session`, async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(undefined, {
        status: 200,
        headers: {
          [`set-cookie`]: `${secureAccessCookieKey}=new-a; Path=/; HttpOnly; SameSite=Lax`,
        },
      }),
    );

    const response = await middleware(
      createRequest(`/login`, {
        [secureRefreshCookieKey]: `valid-r`,
        [csrfCookieKey]: `csrf`,
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get(`location`)).toContain(`/dashboard`);
    expect(response.headers.get(`set-cookie`)).toContain(`${secureAccessCookieKey}=new-a`);
    expect(response.headers.get(`server-timing`)).toContain(`auth_refresh;dur=`);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://example.com/api/consumer/auth/refresh`);
  });

  it(`redirects auth pages with a live access session after probing /api/me`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(`ok`, { status: 200 }));

    const response = await middleware(
      createRequest(`/login`, {
        [secureAccessCookieKey]: createAccessToken(3600),
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get(`location`)).toContain(`/dashboard`);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://example.com/api/me`);
  });

  it(`refreshes auth pages after a stale access probe fails`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 })).mockResolvedValueOnce(
      new Response(undefined, {
        status: 200,
        headers: {
          [`set-cookie`]: `${secureAccessCookieKey}=new-a; Path=/; HttpOnly; SameSite=Lax`,
        },
      }),
    );

    const response = await middleware(
      createRequest(`/login`, {
        [secureAccessCookieKey]: createAccessToken(3600),
        [secureRefreshCookieKey]: `valid-r`,
        [csrfCookieKey]: `csrf`,
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get(`location`)).toContain(`/dashboard`);
    expect(response.headers.get(`set-cookie`)).toContain(`${secureAccessCookieKey}=new-a`);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://example.com/api/me`);
    expect(String(mockFetch.mock.calls[1]?.[0])).toBe(`https://example.com/api/consumer/auth/refresh`);
  });

  it(`refreshes secure requests when only the local refresh cookie is present`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(undefined, { status: 200 }));

    const response = await middleware(
      createRequest(`/settings`, {
        [localRefreshCookieKey]: `local-r`,
        [csrfCookieKey]: `csrf`,
      }),
    );

    expect(response.status).toBe(200);
    expect(mockFetch.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        Cookie: `${secureRefreshCookieKey}=local-r; ${csrfCookieKey}=csrf`,
      }),
    });
  });

  it(`marks refresh failure as session expired and emits verbose telemetry when enabled`, async () => {
    process.env.NEXT_PUBLIC_AUTH_TELEMETRY_HEADERS = `true`;
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 }));

    const response = await middleware(
      createRequest(`/settings`, {
        [secureRefreshCookieKey]: `expired-r`,
        [csrfCookieKey]: `csrf`,
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get(`location`)).toContain(`/login?next=%2Fsettings`);
    expect(response.headers.get(`location`)).toContain(`session_expired=1`);
    expect(response.headers.get(`x-remoola-auth-refresh-attempted`)).toBe(`1`);
    expect(response.headers.get(`x-remoola-auth-refresh-scope`)).toBe(`protected_page`);
    expect(response.headers.get(`x-remoola-auth-refresh-outcome`)).toBe(`http_error`);
    expect(response.headers.get(`x-remoola-auth-refresh-status`)).toBe(`401`);
    expect(response.headers.get(`x-remoola-auth-refresh-latency-ms`)).toMatch(/^\d+$/);
    expect(response.headers.get(`set-cookie`)).toContain(`${secureRefreshCookieKey}=;`);
    expect(response.headers.get(`set-cookie`)).toContain(`${csrfCookieKey}=;`);
    expect(response.headers.get(`set-cookie`)).toContain(`Max-Age=0`);
  });

  it(`clears stale auth cookies on login when auth-page refresh fails`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 }));

    const response = await middleware(
      createRequest(`/login?session_expired=1`, {
        [secureRefreshCookieKey]: `expired-r`,
        [csrfCookieKey]: `csrf`,
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get(`location`)).toBeNull();
    expect(response.headers.get(`set-cookie`)).toContain(`${secureRefreshCookieKey}=;`);
    expect(response.headers.get(`set-cookie`)).toContain(`${csrfCookieKey}=;`);
    expect(response.headers.get(`set-cookie`)).toContain(`Max-Age=0`);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it(`refreshes protected requests when the access token is still signed but the backend session is gone`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 })).mockResolvedValueOnce(
      new Response(undefined, {
        status: 200,
        headers: {
          [`set-cookie`]: [
            `${localAccessCookieKey}=new-a; Path=/; HttpOnly; SameSite=Lax`,
            `${localRefreshCookieKey}=new-r; Path=/; HttpOnly; SameSite=Lax`,
          ].join(`, `),
        },
      }),
    );

    const response = await middleware(
      createRequest(
        `/exchange`,
        {
          [localAccessCookieKey]: createAccessToken(3600),
          [localRefreshCookieKey]: `valid-r`,
          [csrfCookieKey]: `csrf`,
        },
        { origin: `http://localhost:3002` },
      ),
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`http://localhost:3002/api/me`);
    expect(String(mockFetch.mock.calls[1]?.[0])).toBe(`http://localhost:3002/api/consumer/auth/refresh`);
    expect(response.headers.get(`set-cookie`)).toContain(`${localAccessCookieKey}=new-a`);
    expect(response.headers.get(`set-cookie`)).toContain(`${localRefreshCookieKey}=new-r`);
  });

  it(`does not redirect protected server actions when refresh fails`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 }));

    const response = await middleware(
      createRequest(
        `/settings`,
        {
          [secureRefreshCookieKey]: `expired-r`,
          [csrfCookieKey]: `csrf`,
        },
        {
          method: `POST`,
          headers: { 'next-action': `action-id` },
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get(`location`)).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it(`short-circuits protected route when access token cookie is obviously invalid and no refresh exists`, async () => {
    const response = await middleware(
      createRequest(`/dashboard`, {
        [secureAccessCookieKey]: `bad;\nvalue`,
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get(`location`)).toContain(`/login?next=%2Fdashboard`);
    expect(mockFetch).toHaveBeenCalledTimes(0);
  });
});

describe(`sanitizeNextForRedirect`, () => {
  const fallback = `/dashboard`;

  it(`returns fallback for external origin and protocol-relative`, () => {
    expect(sanitizeNextForRedirect(`//evil.com/path`, fallback)).toBe(fallback);
    expect(sanitizeNextForRedirect(`https://evil.com/path`, fallback)).toBe(fallback);
  });

  it(`returns safe internal path`, () => {
    expect(sanitizeNextForRedirect(`/settings`, fallback)).toBe(`/settings`);
  });
});
