import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

import {
  COOKIE_KEYS,
  getConsumerAccessTokenCookieKey,
  getConsumerRefreshTokenCookieKey,
  sanitizeNextForRedirect,
} from '@remoola/api-types';

import { middleware } from './middleware';

type MockFetch = jest.MockedFunction<typeof fetch>;

const secureAccessCookieKey = getConsumerAccessTokenCookieKey({
  isProduction: false,
  isVercel: false,
  cookieSecure: false,
  isSecureRequest: true,
});
const localAccessCookieKey = getConsumerAccessTokenCookieKey({
  isProduction: false,
  isVercel: false,
  cookieSecure: false,
  isSecureRequest: false,
});
const secureRefreshCookieKey = getConsumerRefreshTokenCookieKey({
  isProduction: false,
  isVercel: false,
  cookieSecure: false,
  isSecureRequest: true,
});
const localRefreshCookieKey = getConsumerRefreshTokenCookieKey({
  isProduction: false,
  isVercel: false,
  cookieSecure: false,
  isSecureRequest: false,
});
const csrfCookieKey = COOKIE_KEYS.CSRF_TOKEN;

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

describe(`consumer middleware auth-session behavior`, () => {
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

  it(`refreshes secure requests when only the local refresh cookie is present`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(undefined, { status: 200 }));

    const response = await middleware(
      createRequest(`/settings`, {
        [localRefreshCookieKey]: `local-r`,
        [csrfCookieKey]: `csrf`,
      }),
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        Cookie: `${secureRefreshCookieKey}=local-r; ${csrfCookieKey}=csrf`,
      }),
    });
  });

  it(`marks protected-page refresh failure as session expired when access is missing`, async () => {
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
    expect(mockFetch).toHaveBeenCalledTimes(1);
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
    const accessToken = createAccessToken(3600);

    const response = await middleware(
      createRequest(`/login`, {
        [secureAccessCookieKey]: accessToken,
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get(`location`)).toContain(`/dashboard`);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://example.com/api/me`);
    expect(mockFetch.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        Cookie: `${secureAccessCookieKey}=${accessToken}`,
        origin: `https://example.com`,
      }),
    });
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
    const accessToken = createAccessToken(3600);

    const response = await middleware(
      createRequest(`/login`, {
        [secureAccessCookieKey]: accessToken,
        [secureRefreshCookieKey]: `valid-r`,
        [csrfCookieKey]: `csrf`,
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get(`location`)).toContain(`/dashboard`);
    expect(response.headers.get(`set-cookie`)).toContain(`${secureAccessCookieKey}=new-a`);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://example.com/api/me`);
    expect(mockFetch.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        Cookie: `${secureAccessCookieKey}=${accessToken}`,
        origin: `https://example.com`,
      }),
    });
    expect(String(mockFetch.mock.calls[1]?.[0])).toBe(`https://example.com/api/consumer/auth/refresh`);
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
    const accessToken = createAccessToken(3600);

    const response = await middleware(
      createRequest(
        `/exchange`,
        {
          [localAccessCookieKey]: accessToken,
          [localRefreshCookieKey]: `valid-r`,
          [csrfCookieKey]: `csrf`,
        },
        { origin: `http://localhost:3001` },
      ),
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`http://localhost:3001/api/me`);
    expect(mockFetch.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        Cookie: `${localAccessCookieKey}=${accessToken}`,
        origin: `http://localhost:3001`,
      }),
    });
    expect(String(mockFetch.mock.calls[1]?.[0])).toBe(`http://localhost:3001/api/consumer/auth/refresh`);
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

  it(`returns fallback for empty or null`, () => {
    expect(sanitizeNextForRedirect(undefined, fallback)).toBe(fallback);
    expect(sanitizeNextForRedirect(null, fallback)).toBe(fallback);
    expect(sanitizeNextForRedirect(``, fallback)).toBe(fallback);
  });

  it(`returns fallback for protocol-relative`, () => {
    expect(sanitizeNextForRedirect(`//evil.com/path`, fallback)).toBe(fallback);
  });

  it(`returns fallback for external origin`, () => {
    expect(sanitizeNextForRedirect(`https://evil.com/path`, fallback)).toBe(fallback);
    expect(sanitizeNextForRedirect(`http://evil.com/path`, fallback)).toBe(fallback);
  });

  it(`returns fallback for malformed decode`, () => {
    expect(sanitizeNextForRedirect(`%`, fallback)).toBe(fallback);
    expect(sanitizeNextForRedirect(`%2`, fallback)).toBe(fallback);
  });

  it(`returns fallback for path not starting with /`, () => {
    expect(sanitizeNextForRedirect(`dashboard`, fallback)).toBe(fallback);
  });

  it(`returns safe internal path`, () => {
    expect(sanitizeNextForRedirect(`/settings`, fallback)).toBe(`/settings`);
    expect(sanitizeNextForRedirect(`/settings/foo`, fallback)).toBe(`/settings/foo`);
    expect(sanitizeNextForRedirect(encodeURIComponent(`/settings`), fallback)).toBe(`/settings`);
  });

  it(`returns fallback for /logout`, () => {
    expect(sanitizeNextForRedirect(`/logout`, fallback)).toBe(fallback);
    expect(sanitizeNextForRedirect(`/logout?x=1`, fallback)).toBe(fallback);
  });
});
