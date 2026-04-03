import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

import { sanitizeNextForRedirect } from '@remoola/api-types';

import { getAdminAccessCookieKey, getAdminCsrfCookieKey, getAdminRefreshCookieKey } from './lib/auth-cookie-policy';
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
  const accessCookieKey = getAdminAccessCookieKey();
  const refreshCookieKey = getAdminRefreshCookieKey();
  const csrfCookieKey = getAdminCsrfCookieKey();

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
        [accessCookieKey]: `expired-a`,
        [refreshCookieKey]: `expired-r`,
      }),
    );

    expect(response.status).toBe(307);
    const location = response.headers.get(`location`);
    expect(location).toContain(`/login`);
    expect(location).toContain(`next=%2Fdashboard`);
  });

  it(`refresh success -> continue with cookies set`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(undefined, { status: 401 })).mockResolvedValueOnce(
      new Response(undefined, {
        status: 200,
        headers: {
          [`set-cookie`]: [
            `${accessCookieKey}=new-a; Path=/; HttpOnly; SameSite=Lax`,
            `${refreshCookieKey}=new-r; Path=/; HttpOnly; SameSite=Lax`,
            `${csrfCookieKey}=new-csrf; Path=/; SameSite=Lax`,
          ].join(`, `),
        },
      }),
    );

    const response = await middleware(
      createRequest(`/dashboard`, {
        [accessCookieKey]: `expired-b`,
        [refreshCookieKey]: `valid-r`,
        [csrfCookieKey]: `csrf`,
      }),
    );

    expect(response.status).not.toBe(307);
    expect(response.cookies.get(accessCookieKey)?.value).toBe(`new-a`);
    expect(response.cookies.get(refreshCookieKey)?.value).toBe(`new-r`);
    expect(response.cookies.get(csrfCookieKey)?.value).toBe(`new-csrf`);
  });

  it(`refresh without replacement access cookie -> login redirect`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(undefined, { status: 401 })).mockResolvedValueOnce(
      new Response(undefined, {
        status: 200,
        headers: {
          [`set-cookie`]: [
            `${refreshCookieKey}=new-r; Path=/; HttpOnly; SameSite=Lax`,
            `${csrfCookieKey}=new-csrf; Path=/; SameSite=Lax`,
          ].join(`, `),
        },
      }),
    );

    const response = await middleware(
      createRequest(`/dashboard`, {
        [accessCookieKey]: `expired-c`,
        [refreshCookieKey]: `valid-r`,
        [csrfCookieKey]: `csrf`,
      }),
    );

    expect(response.status).toBe(307);
    const location = response.headers.get(`location`);
    expect(location).toContain(`/login`);
    expect(location).toContain(`next=%2Fdashboard`);
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
