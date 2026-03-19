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

  it(`redirects to login when no access token`, async () => {
    const response = await middleware(createRequest(`/dashboard`));
    expect(response.status).toBe(307);
    expect(response.headers.get(`location`)).toContain(`/login`);
    expect(response.headers.get(`location`)).toContain(`next=`);
  });

  it(`invalid token + refresh fail -> login redirect with sanitized next`, async () => {
    mockFetch
      .mockResolvedValueOnce(new Response(undefined, { status: 401 }))
      .mockResolvedValueOnce(new Response(undefined, { status: 401 }));

    const response = await middleware(
      createRequest(`/dashboard`, {
        [COOKIE_KEYS.ADMIN_ACCESS_TOKEN]: `expired-a`,
        [COOKIE_KEYS.ADMIN_REFRESH_TOKEN]: `expired-r`,
      }),
    );

    expect(response.status).toBe(307);
    const location = response.headers.get(`location`);
    expect(location).toContain(`/login`);
    expect(location).toContain(`next=%2Fdashboard`);
  });

  it(`refresh success -> continue with cookies set`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(undefined, { status: 401 })).mockResolvedValueOnce(
      new Response(JSON.stringify({ accessToken: `new-a`, refreshToken: `new-r` }), {
        status: 200,
        headers: { 'Content-Type': `application/json` },
      }),
    );

    const response = await middleware(
      createRequest(`/dashboard`, {
        [COOKIE_KEYS.ADMIN_ACCESS_TOKEN]: `expired-b`,
        [COOKIE_KEYS.ADMIN_REFRESH_TOKEN]: `valid-r`,
      }),
    );

    expect(response.status).not.toBe(307);
    expect(response.cookies.get(COOKIE_KEYS.ADMIN_ACCESS_TOKEN)?.value).toBe(`new-a`);
    expect(response.cookies.get(COOKIE_KEYS.ADMIN_REFRESH_TOKEN)?.value).toBe(`new-r`);
  });

  it(`allows public path /login`, async () => {
    const response = await middleware(createRequest(`/login`));
    expect(response.status).not.toBe(307);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe(`sanitizeNextForRedirect`, () => {
  const fallback = `/dashboard`;

  it(`returns fallback for external origin and protocol-relative`, () => {
    expect(sanitizeNextForRedirect(`//evil.com/path`, fallback)).toBe(fallback);
    expect(sanitizeNextForRedirect(`https://evil.com/path`, fallback)).toBe(fallback);
  });

  it(`returns safe internal path`, () => {
    expect(sanitizeNextForRedirect(`/dashboard`, fallback)).toBe(`/dashboard`);
    expect(sanitizeNextForRedirect(`/settings`, fallback)).toBe(`/settings`);
  });
});
