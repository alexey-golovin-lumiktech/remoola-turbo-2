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
    mockFetch = jest.fn() as MockFetch;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
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
  });
});
