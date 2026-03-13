import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

import { COOKIE_KEYS } from '@remoola/api-types';

import { middleware } from './middleware';

type MockFetch = jest.MockedFunction<typeof fetch>;

function createRequest(pathname: string, cookies: Record<string, string> = {}): NextRequest {
  const req = new NextRequest(`https://example.com${pathname}`);
  for (const [k, v] of Object.entries(cookies)) {
    req.cookies.set(k, v);
  }
  return req;
}

describe(`middleware`, () => {
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

  it(`redirects protected pages to login when no access cookie`, async () => {
    const response = await middleware(createRequest(`/dashboard`));
    expect(response.status).toBe(307);
    expect(response.headers.get(`location`)).toContain(`/login?next=%2Fdashboard`);
  });

  it(`refreshes expired access token once`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 }));
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ accessToken: `new-a` }), {
        status: 200,
        headers: {
          [`set-cookie`]: `${COOKIE_KEYS.CONSUMER_ACCESS_TOKEN}=new-a; Path=/; HttpOnly; SameSite=Lax`,
        },
      }),
    );

    const response = await middleware(
      createRequest(`/dashboard`, {
        [COOKIE_KEYS.CONSUMER_ACCESS_TOKEN]: `expired-a`,
        [COOKIE_KEYS.CONSUMER_REFRESH_TOKEN]: `valid-r`,
        [COOKIE_KEYS.CSRF_TOKEN]: `csrf`,
      }),
    );

    expect(response.status).not.toBe(307);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(String(mockFetch.mock.calls[1]?.[0])).toContain(`/consumer/auth/refresh`);
    expect(response.headers.get(`set-cookie`)).toContain(`${COOKIE_KEYS.CONSUMER_ACCESS_TOKEN}=new-a`);
    expect(response.headers.get(`x-remoola-auth-refresh-attempted`)).toBeNull();
    expect(response.headers.get(`x-remoola-auth-refresh-scope`)).toBeNull();
    expect(response.headers.get(`x-remoola-auth-refresh-outcome`)).toBeNull();
    expect(response.headers.get(`x-remoola-auth-refresh-status`)).toBeNull();
    expect(response.headers.get(`x-remoola-auth-refresh-latency-ms`)).toBeNull();
    expect(response.headers.get(`server-timing`)).toContain(`auth_refresh;dur=`);
  });

  it(`redirects to login when refresh fails`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 }));
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 }));

    const response = await middleware(
      createRequest(`/settings`, {
        [COOKIE_KEYS.CONSUMER_ACCESS_TOKEN]: `expired-a`,
        [COOKIE_KEYS.CONSUMER_REFRESH_TOKEN]: `expired-r`,
        [COOKIE_KEYS.CSRF_TOKEN]: `csrf`,
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get(`location`)).toContain(`/login?next=%2Fsettings`);
    expect(response.headers.get(`x-remoola-auth-refresh-attempted`)).toBeNull();
    expect(response.headers.get(`x-remoola-auth-refresh-scope`)).toBeNull();
    expect(response.headers.get(`x-remoola-auth-refresh-outcome`)).toBeNull();
    expect(response.headers.get(`x-remoola-auth-refresh-status`)).toBeNull();
    expect(response.headers.get(`x-remoola-auth-refresh-latency-ms`)).toBeNull();
    expect(response.headers.get(`server-timing`)).toContain(`auth_refresh;dur=`);
  });

  it(`allows login page when access token is expired and refresh fails (avoids TOO_MANY_REDIRECTS)`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 }));
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 }));

    const response = await middleware(
      createRequest(`/login`, {
        [COOKIE_KEYS.CONSUMER_ACCESS_TOKEN]: `expired-a`,
        [COOKIE_KEYS.CONSUMER_REFRESH_TOKEN]: `expired-r`,
        [COOKIE_KEYS.CSRF_TOKEN]: `csrf`,
      }),
    );

    // No redirect – user can stay on login page (avoids TOO_MANY_REDIRECTS loop)
    expect(response.status).not.toBe(307);
    expect(response.headers.get(`x-remoola-auth-refresh-attempted`)).toBeNull();
    expect(response.headers.get(`x-remoola-auth-refresh-scope`)).toBeNull();
    expect(response.headers.get(`x-remoola-auth-refresh-outcome`)).toBeNull();
    expect(response.headers.get(`x-remoola-auth-refresh-status`)).toBeNull();
    expect(response.headers.get(`server-timing`)).toContain(`auth_refresh;dur=`);
  });

  it(`allows login page without refresh when auth endpoint is unavailable`, async () => {
    mockFetch.mockRejectedValueOnce(new Error(`network down`));

    const response = await middleware(
      createRequest(`/login`, {
        [COOKIE_KEYS.CONSUMER_ACCESS_TOKEN]: `possibly-valid-a`,
        [COOKIE_KEYS.CONSUMER_REFRESH_TOKEN]: `valid-r`,
        [COOKIE_KEYS.CSRF_TOKEN]: `csrf`,
      }),
    );

    expect(response.status).not.toBe(307);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(String(mockFetch.mock.calls[0]?.[0])).toContain(`/consumer/auth/me`);
  });

  it(`short-circuits protected route when access token cookie is obviously invalid`, async () => {
    const response = await middleware(
      createRequest(`/dashboard`, {
        [COOKIE_KEYS.CONSUMER_ACCESS_TOKEN]: `bad;\nvalue`,
        [COOKIE_KEYS.CONSUMER_REFRESH_TOKEN]: `valid-r`,
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get(`location`)).toContain(`/login?next=%2Fdashboard`);
    expect(mockFetch).toHaveBeenCalledTimes(0);
  });

  it(`does not call auth backend on login page when access token cookie is obviously invalid`, async () => {
    const response = await middleware(
      createRequest(`/login`, {
        [COOKIE_KEYS.CONSUMER_ACCESS_TOKEN]: `bad;\nvalue`,
        [COOKIE_KEYS.CONSUMER_REFRESH_TOKEN]: `valid-r`,
      }),
    );

    expect(response.status).not.toBe(307);
    expect(mockFetch).toHaveBeenCalledTimes(0);
  });

  it(`emits verbose refresh telemetry headers when explicitly enabled`, async () => {
    process.env.NEXT_PUBLIC_AUTH_TELEMETRY_HEADERS = `true`;
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 }));
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 }));

    const response = await middleware(
      createRequest(`/settings`, {
        [COOKIE_KEYS.CONSUMER_ACCESS_TOKEN]: `expired-a`,
        [COOKIE_KEYS.CONSUMER_REFRESH_TOKEN]: `expired-r`,
        [COOKIE_KEYS.CSRF_TOKEN]: `csrf`,
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get(`x-remoola-auth-refresh-attempted`)).toBe(`1`);
    expect(response.headers.get(`x-remoola-auth-refresh-scope`)).toBe(`protected_page`);
    expect(response.headers.get(`x-remoola-auth-refresh-outcome`)).toBe(`http_error`);
    expect(response.headers.get(`x-remoola-auth-refresh-status`)).toBe(`401`);
    expect(response.headers.get(`x-remoola-auth-refresh-latency-ms`)).toMatch(/^\d+$/);
    expect(response.headers.get(`server-timing`)).toContain(`auth_refresh;dur=`);
  });
});
