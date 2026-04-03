import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  AUTH_NOTICE_QUERY,
  COOKIE_KEYS,
  getConsumerMobileAccessTokenCookieKeysForRead,
  getConsumerMobileDeviceCookieKeysForRead,
  getConsumerMobileRefreshTokenCookieKeysForRead,
} from '@remoola/api-types';

import * as routeModule from './route';
import { getSetCookieValues } from '../../lib/api-utils';

type MockFetch = jest.MockedFunction<typeof fetch>;

describe(`/logout-all route`, () => {
  const originalFetch = global.fetch;
  const originalApiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  let mockFetch: MockFetch;
  const routeExports = routeModule as Record<string, unknown>;
  const { POST } = routeModule;

  beforeEach(() => {
    mockFetch = jest.fn() as MockFetch;
    global.fetch = mockFetch;
    process.env.NEXT_PUBLIC_API_BASE_URL = `https://api.example.com`;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBase;
  });

  it(`does not expose a GET handler`, () => {
    expect(routeExports.GET).toBeUndefined();
  });

  it(`clears local cookies and redirects to login after successful backend logout-all POST`, async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(`ok`, {
        status: 200,
        headers: { [`set-cookie`]: `backend_cookie=gone; Path=/; Max-Age=0` },
      }),
    );

    const request = new Request(`https://app.example.com/logout-all`, {
      headers: {
        cookie: `${COOKIE_KEYS.CONSUMER_MOBILE_CSRF_TOKEN}=csrf-token`,
        host: `app.example.com`,
      },
    });

    const response = await POST(request);
    const setCookies = getSetCookieValues(response.headers);
    const location = new URL(response.headers.get(`location`) ?? ``);
    const forwardedHeaders = mockFetch.mock.calls[0]?.[1]?.headers as Headers;

    expect(response.status).toBe(303);
    expect(location.pathname).toBe(`/login`);
    expect(location.searchParams.get(AUTH_NOTICE_QUERY)).toBe(`signed_out_all_sessions`);
    expect(forwardedHeaders.get(`x-csrf-token`)).toBe(`csrf-token`);
    expect(forwardedHeaders.get(`host`)).toBeNull();

    for (const key of getConsumerMobileAccessTokenCookieKeysForRead()) {
      expect(setCookies.some((cookie) => cookie.startsWith(`${key}=`))).toBe(true);
    }
    for (const key of getConsumerMobileRefreshTokenCookieKeysForRead()) {
      expect(setCookies.some((cookie) => cookie.startsWith(`${key}=`))).toBe(true);
    }
    for (const key of getConsumerMobileDeviceCookieKeysForRead()) {
      expect(setCookies.some((cookie) => cookie.startsWith(`${key}=`))).toBe(true);
    }
    expect(setCookies.some((cookie) => cookie.startsWith(`${COOKIE_KEYS.CONSUMER_MOBILE_CSRF_TOKEN}=`))).toBe(true);
    expect(setCookies.some((cookie) => cookie.startsWith(`${COOKIE_KEYS.CONSUMER_MOBILE_GOOGLE_OAUTH_STATE}=`))).toBe(
      true,
    );
  });

  it(`returns to settings when backend logout-all POST fails`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(`nope`, { status: 500 }));

    const request = new Request(`https://app.example.com/logout-all`);
    const response = await POST(request);
    const setCookies = getSetCookieValues(response.headers);
    const location = new URL(response.headers.get(`location`) ?? ``);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe(`/settings`);
    expect(location.searchParams.get(`logout_all_failed`)).toBe(`1`);
    expect(setCookies).toHaveLength(0);
  });
});
