import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

import { COOKIE_KEYS, sanitizeNextForRedirect } from '@remoola/api-types';

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
    mockFetch = jest.fn() as MockFetch;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it(`redirects protected pages to login when no access cookie`, async () => {
    const response = await middleware(createRequest(`/dashboard`));
    expect(response.status).toBe(307);
    expect(response.headers.get(`location`)).toContain(`/login?next=`);
    expect(response.headers.get(`location`)).toContain(`%2Fdashboard`);
  });

  it(`stale cookie on /login does not redirect to dashboard`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(undefined, { status: 401 }));
    mockFetch.mockResolvedValueOnce(new Response(undefined, { status: 401 }));

    const response = await middleware(
      createRequest(`/login`, {
        [COOKIE_KEYS.CONSUMER_ACCESS_TOKEN]: `expired-a`,
        [COOKIE_KEYS.CONSUMER_REFRESH_TOKEN]: `expired-r`,
        [COOKIE_KEYS.CSRF_TOKEN]: `csrf`,
      }),
    );

    expect(response.status).not.toBe(307);
    const location = response.headers.get(`location`);
    expect(location == null || !location.includes(`/dashboard`)).toBe(true);
  });

  it(`protected route + invalid token + refresh fail -> login redirect`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(undefined, { status: 401 }));
    mockFetch.mockResolvedValueOnce(new Response(undefined, { status: 401 }));

    const response = await middleware(
      createRequest(`/settings`, {
        [COOKIE_KEYS.CONSUMER_ACCESS_TOKEN]: `expired-a`,
        [COOKIE_KEYS.CONSUMER_REFRESH_TOKEN]: `expired-r`,
        [COOKIE_KEYS.CSRF_TOKEN]: `csrf`,
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get(`location`)).toContain(`/login?next=`);
    expect(response.headers.get(`location`)).toContain(`%2Fsettings`);
  });

  it(`protected route + refresh success -> continue with Set-Cookie`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(undefined, { status: 401 }));
    mockFetch.mockResolvedValueOnce(
      new Response(null, {
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
    expect(response.headers.get(`set-cookie`)).toContain(`${COOKIE_KEYS.CONSUMER_ACCESS_TOKEN}=new-a`);
  });

  it(`short-circuits protected route when access token cookie is obviously invalid`, async () => {
    const response = await middleware(
      createRequest(`/dashboard`, {
        [COOKIE_KEYS.CONSUMER_ACCESS_TOKEN]: `bad;\nvalue`,
        [COOKIE_KEYS.CONSUMER_REFRESH_TOKEN]: `valid-r`,
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get(`location`)).toContain(`/login?next=`);
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
