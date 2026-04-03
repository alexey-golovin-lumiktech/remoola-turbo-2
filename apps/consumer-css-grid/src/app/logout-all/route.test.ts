import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  AUTH_NOTICE_QUERY,
  getApiV2ConsumerAccessTokenCookieKeysForRead,
  getApiV2ConsumerCsrfTokenCookieKey,
  getApiV2ConsumerDeviceCookieKeysForRead,
  getApiV2ConsumerRefreshTokenCookieKeysForRead,
  getApiV2GoogleOAuthStateCookieKey,
} from '@remoola/api-types';

import * as routeModule from './route';
import { getSetCookieValues } from '../../lib/api-utils';

type MockFetch = jest.MockedFunction<typeof fetch>;

describe(`logout-all route`, () => {
  const originalFetch = global.fetch;
  let mockFetch: MockFetch;
  const routeExports = routeModule as Record<string, unknown>;
  const { POST } = routeModule;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = `https://api.example.com`;
    mockFetch = jest.fn() as MockFetch;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  it(`does not expose a GET handler`, () => {
    expect(routeExports.GET).toBeUndefined();
  });

  it(`clears local cookies and redirects to login after successful backend logout-all POST`, async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(`ok`, {
        status: 200,
        headers: {
          [`set-cookie`]: `backend_cookie=gone; Path=/; Max-Age=0`,
        },
      }),
    );

    const csrfCookieKey = getApiV2ConsumerCsrfTokenCookieKey();
    const request = new Request(`https://app.example.com/logout-all`, {
      headers: {
        cookie: `${csrfCookieKey}=csrf-token`,
        host: `app.example.com`,
      },
    });

    const response = await POST(request);
    const setCookies = getSetCookieValues(response.headers);
    const location = new URL(response.headers.get(`location`) ?? ``);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe(`/login`);
    expect(location.searchParams.get(AUTH_NOTICE_QUERY)).toBe(`signed_out_all_sessions`);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0]?.[0].toString()).toBe(`https://api.example.com/consumer/auth/logout-all`);
    expect(mockFetch.mock.calls[0]?.[1]?.method).toBe(`POST`);
    const forwardedHeaders = mockFetch.mock.calls[0]?.[1]?.headers as Headers;
    expect(forwardedHeaders.get(`x-csrf-token`)).toBe(`csrf-token`);
    expect(forwardedHeaders.get(`host`)).toBeNull();

    for (const key of getApiV2ConsumerAccessTokenCookieKeysForRead()) {
      expect(setCookies.some((cookie) => cookie.startsWith(`${key}=`))).toBe(true);
    }
    for (const key of getApiV2ConsumerRefreshTokenCookieKeysForRead()) {
      expect(setCookies.some((cookie) => cookie.startsWith(`${key}=`))).toBe(true);
    }
    for (const key of getApiV2ConsumerDeviceCookieKeysForRead()) {
      expect(setCookies.some((cookie) => cookie.startsWith(`${key}=`))).toBe(true);
    }
    expect(setCookies.some((cookie) => cookie.startsWith(`${csrfCookieKey}=`))).toBe(true);
    expect(setCookies.some((cookie) => cookie.startsWith(`${getApiV2GoogleOAuthStateCookieKey()}=`))).toBe(true);
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
