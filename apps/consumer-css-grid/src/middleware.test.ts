import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

import {
  getApiV2ConsumerAccessTokenCookieKey,
  getApiV2ConsumerCsrfTokenCookieKeyForRuntime,
  getApiV2ConsumerRefreshTokenCookieKey,
} from '@remoola/api-types';

import { middleware } from './middleware';

type MockFetch = jest.MockedFunction<typeof fetch>;
const secureAccessCookieKey = getApiV2ConsumerAccessTokenCookieKey({
  isProduction: false,
  isVercel: false,
  cookieSecure: false,
  isSecureRequest: true,
});
const localAccessCookieKey = getApiV2ConsumerAccessTokenCookieKey({
  isProduction: false,
  isVercel: false,
  cookieSecure: false,
  isSecureRequest: false,
});
const localRefreshCookieKey = getApiV2ConsumerRefreshTokenCookieKey({
  isProduction: false,
  isVercel: false,
  cookieSecure: false,
  isSecureRequest: false,
});
const secureRefreshCookieKey = getApiV2ConsumerRefreshTokenCookieKey({
  isProduction: false,
  isVercel: false,
  cookieSecure: false,
  isSecureRequest: true,
});
const secureCsrfCookieKey = getApiV2ConsumerCsrfTokenCookieKeyForRuntime({
  isProduction: false,
  isVercel: false,
  cookieSecure: false,
  isSecureRequest: true,
});
const localCsrfCookieKey = getApiV2ConsumerCsrfTokenCookieKeyForRuntime({
  isProduction: false,
  isVercel: false,
  cookieSecure: false,
  isSecureRequest: false,
});

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
  const signature = `signature`;
  return `${header}.${payload}.${signature}`;
}

describe(`consumer-css-grid middleware auth-session behavior`, () => {
  const originalFetch = global.fetch;
  let mockFetch: MockFetch;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = `https://api.example.com`;
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
        [secureCsrfCookieKey]: `csrf`,
      }),
    );

    expect(response.status).not.toBe(307);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://example.com/api/consumer/auth/refresh`);
    expect(response.headers.get(`set-cookie`)).toContain(`${secureAccessCookieKey}=new-a`);
  });

  it(`refreshes secure requests when only the local v2 refresh cookie is present`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(undefined, { status: 200 }));

    const response = await middleware(
      createRequest(`/settings`, {
        [localRefreshCookieKey]: `local-r`,
        [secureCsrfCookieKey]: `csrf`,
      }),
    );

    expect(response.status).not.toBe(307);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        Cookie: `${secureRefreshCookieKey}=local-r; ${secureCsrfCookieKey}=csrf`,
      }),
    });
  });

  it(`marks protected-page refresh failure as session expired when access is missing`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 }));

    const response = await middleware(
      createRequest(`/settings`, {
        [secureRefreshCookieKey]: `expired-r`,
        [secureCsrfCookieKey]: `csrf`,
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get(`location`)).toContain(`/login?next=%2Fsettings`);
    expect(response.headers.get(`location`)).toContain(`session_expired=1`);
    expect(response.headers.get(`set-cookie`)).toContain(`${secureRefreshCookieKey}=;`);
    expect(response.headers.get(`set-cookie`)).toContain(`${secureCsrfCookieKey}=;`);
    expect(response.headers.get(`set-cookie`)).toContain(`Max-Age=0`);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://example.com/api/consumer/auth/refresh`);
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
        [secureCsrfCookieKey]: `csrf`,
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
        [secureCsrfCookieKey]: `csrf`,
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get(`location`)).toContain(`/dashboard`);
    expect(response.headers.get(`set-cookie`)).toContain(`${secureAccessCookieKey}=new-a`);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://example.com/api/me`);
    expect(String(mockFetch.mock.calls[1]?.[0])).toBe(`https://example.com/api/consumer/auth/refresh`);
  });

  it(`clears stale auth cookies on login when auth-page refresh fails`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 }));

    const response = await middleware(
      createRequest(`/login?session_expired=1`, {
        [secureRefreshCookieKey]: `expired-r`,
        [secureCsrfCookieKey]: `csrf`,
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get(`location`)).toBeNull();
    expect(response.headers.get(`set-cookie`)).toContain(`${secureRefreshCookieKey}=;`);
    expect(response.headers.get(`set-cookie`)).toContain(`${secureCsrfCookieKey}=;`);
    expect(response.headers.get(`set-cookie`)).toContain(`Max-Age=0`);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://example.com/api/consumer/auth/refresh`);
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
          [localCsrfCookieKey]: `csrf`,
        },
        { origin: `http://localhost:3003` },
      ),
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`http://localhost:3003/api/me`);
    expect(String(mockFetch.mock.calls[1]?.[0])).toBe(`http://localhost:3003/api/consumer/auth/refresh`);
    expect(response.headers.get(`set-cookie`)).toContain(`${localAccessCookieKey}=new-a`);
    expect(response.headers.get(`set-cookie`)).toContain(`${localRefreshCookieKey}=new-r`);
  });

  it(`does not trust a structurally valid access token when /api/me rejects it`, async () => {
    const validToken = createAccessToken(3600);
    const tamperedToken = `${validToken.slice(0, -1)}x`;
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 }));

    const response = await middleware(
      createRequest(`/settings`, {
        [localAccessCookieKey]: tamperedToken,
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get(`location`)).toContain(`/login?next=%2Fsettings`);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://example.com/api/me`);
  });

  it(`accepts unexpired access cookies on protected pages after probing /api/me`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(`ok`, { status: 200 }));
    const response = await middleware(
      createRequest(`/settings`, {
        [localAccessCookieKey]: createAccessToken(3600),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://example.com/api/me`);
  });

  it(`allows signup pages without auth cookies`, async () => {
    const response = await middleware(createRequest(`/signup/start`));

    expect(response.status).toBe(200);
    expect(response.headers.get(`location`)).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(0);
  });

  it(`marks refresh-token failure as session expired after local access expiry detection on a protected page`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 }));
    const response = await middleware(
      createRequest(`/settings`, {
        [secureAccessCookieKey]: createAccessToken(-60),
        [secureRefreshCookieKey]: `expired-r`,
        [secureCsrfCookieKey]: `csrf`,
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get(`location`)).toContain(`/login?next=%2Fsettings`);
    expect(response.headers.get(`location`)).toContain(`session_expired=1`);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://example.com/api/consumer/auth/refresh`);
  });

  it(`does not redirect protected server actions when local access expiry detection and refresh both fail`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 }));
    const response = await middleware(
      createRequest(
        `/settings`,
        {
          [secureAccessCookieKey]: createAccessToken(-60),
          [secureRefreshCookieKey]: `expired-r`,
          [secureCsrfCookieKey]: `csrf`,
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
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://example.com/api/consumer/auth/refresh`);
  });

  it(`does not redirect protected server actions when no auth cookies are present`, async () => {
    const response = await middleware(
      createRequest(`/settings`, {}, { method: `POST`, headers: { 'next-action': `action-id` } }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get(`location`)).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(0);
  });

  it(`uses the current localhost origin for middleware refresh requests`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 }));

    const request = createRequest(
      `/settings`,
      {
        [localRefreshCookieKey]: `valid-r`,
        [localCsrfCookieKey]: `csrf`,
      },
      { origin: `http://localhost:3003` },
    );

    await middleware(request);

    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`${request.nextUrl.origin}/api/consumer/auth/refresh`);
  });

  it(`prefers the local v2 refresh cookie on localhost when both variants are present`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 }));

    const request = createRequest(
      `/settings`,
      {
        [localRefreshCookieKey]: `local-r`,
        [secureRefreshCookieKey]: `secure-r`,
        [localCsrfCookieKey]: `csrf`,
      },
      { origin: `http://localhost:3003` },
    );

    await middleware(request);

    expect(mockFetch.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        Cookie: `${localRefreshCookieKey}=local-r; ${localCsrfCookieKey}=csrf`,
      }),
    });
  });

  it(`keeps refresh on the request-derived loopback origin for 127.0.0.1 requests`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 }));

    const request = createRequest(
      `/settings`,
      {
        [localRefreshCookieKey]: `valid-r`,
        [localCsrfCookieKey]: `csrf`,
      },
      { origin: `http://127.0.0.1:3003` },
    );

    await middleware(request);

    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`${request.nextUrl.origin}/api/consumer/auth/refresh`);
  });
});
