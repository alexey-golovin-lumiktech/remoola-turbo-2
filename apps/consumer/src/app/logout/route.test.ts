import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  COOKIE_KEYS,
  getConsumerAccessTokenCookieKeysForRead,
  getConsumerDeviceCookieKeysForRead,
  getConsumerRefreshTokenCookieKeysForRead,
} from '@remoola/api-types';

import * as routeModule from './route';
import { getSetCookieValues } from '../../lib/api-utils';

type MockFetch = jest.MockedFunction<typeof fetch>;

describe(`/logout route`, () => {
  const originalApiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  const originalFetch = global.fetch;
  let mockFetch: MockFetch;
  const routeExports = routeModule as Record<string, unknown>;
  const { POST } = routeModule;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    mockFetch = jest.fn() as MockFetch;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBase;
    global.fetch = originalFetch;
  });

  it(`does not expose a GET handler`, () => {
    expect(routeExports.GET).toBeUndefined();
  });

  it(`clears local auth cookies after successful backend logout POST`, async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = `https://api.example.com`;
    mockFetch.mockResolvedValueOnce(
      new Response(`ok`, {
        status: 200,
        headers: { [`set-cookie`]: `backend_cookie=gone; Path=/; Max-Age=0` },
      }),
    );

    const request = new Request(`https://app.example.com/logout`, {
      headers: {
        cookie: `${COOKIE_KEYS.CSRF_TOKEN}=csrf-token`,
        host: `app.example.com`,
      },
    });

    const response = await POST(request);
    const setCookies = getSetCookieValues(response.headers);
    const forwardedHeaders = mockFetch.mock.calls[0]?.[1]?.headers as Headers;

    expect(response.status).toBe(303);
    expect(new URL(response.headers.get(`location`) ?? ``).pathname).toBe(`/login`);
    expect(forwardedHeaders.get(`x-csrf-token`)).toBe(`csrf-token`);
    expect(forwardedHeaders.get(`host`)).toBeNull();

    for (const key of getConsumerAccessTokenCookieKeysForRead()) {
      expect(setCookies.some((cookie) => cookie.startsWith(`${key}=`))).toBe(true);
    }
    for (const key of getConsumerRefreshTokenCookieKeysForRead()) {
      expect(setCookies.some((cookie) => cookie.startsWith(`${key}=`))).toBe(true);
    }
    for (const key of getConsumerDeviceCookieKeysForRead()) {
      expect(setCookies.some((cookie) => cookie.startsWith(`${key}=`))).toBe(true);
    }
    expect(setCookies.some((cookie) => cookie.startsWith(`${COOKIE_KEYS.CSRF_TOKEN}=`))).toBe(true);
    expect(setCookies.some((cookie) => cookie.startsWith(`${COOKIE_KEYS.GOOGLE_OAUTH_STATE}=`))).toBe(true);
  });
});
