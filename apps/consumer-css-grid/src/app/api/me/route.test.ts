import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { type NextRequest } from 'next/server';

import { GET } from './route';
import { getSetCookieValues } from '../../../lib/api-utils';

type MockFetch = jest.MockedFunction<typeof fetch>;

describe(`me route`, () => {
  const originalFetch = global.fetch;
  let mockFetch: MockFetch;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = `https://api.example.com`;
    mockFetch = jest.fn() as MockFetch;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  it(`forwards cookie auth context while dropping incoming authorization headers and host`, async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: `consumer-1` }), {
        status: 200,
        headers: {
          [`set-cookie`]: `me_cookie=ok; Path=/; HttpOnly`,
        },
      }),
    );

    const request = new Request(`https://app.example.com/api/me`, {
      method: `GET`,
      headers: {
        authorization: `legacy-token`,
        cookie: `consumer_session=session-cookie`,
        host: `app.example.com`,
        'x-correlation-id': `corr-1`,
      },
    });

    const response = await GET(request as unknown as NextRequest);
    const forwardedHeaders = mockFetch.mock.calls[0]?.[1]?.headers as Headers | undefined;

    expect(response.status).toBe(200);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://api.example.com/api/consumer/auth/me`);
    expect(forwardedHeaders?.get(`authorization`)).toBeNull();
    expect(forwardedHeaders?.get(`cookie`)).toBe(`consumer_session=session-cookie`);
    expect(forwardedHeaders?.get(`host`)).toBeNull();
    expect(forwardedHeaders?.get(`x-correlation-id`)).toBe(`corr-1`);
    expect(getSetCookieValues(response.headers).some((cookie) => cookie.startsWith(`me_cookie=`))).toBe(true);
  });

  it(`returns normalized upstream errors while preserving upstream cookies`, async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: `UNAUTHORIZED` }), {
        status: 401,
        headers: {
          [`set-cookie`]: `me_cookie=expired; Path=/; HttpOnly`,
        },
      }),
    );

    const response = await GET(new Request(`https://app.example.com/api/me`) as unknown as NextRequest);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ code: `UPSTREAM_ERROR`, status: 401 });
    expect(getSetCookieValues(response.headers).some((cookie) => cookie.startsWith(`me_cookie=`))).toBe(true);
  });

  it(`returns INVALID_RESPONSE when upstream success body is not valid json`, async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(`not-json`, {
        status: 200,
        headers: {
          [`content-type`]: `text/plain`,
          [`set-cookie`]: `me_cookie=ok; Path=/; HttpOnly`,
        },
      }),
    );

    const response = await GET(new Request(`https://app.example.com/api/me`) as unknown as NextRequest);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ code: `INVALID_RESPONSE` });
    expect(getSetCookieValues(response.headers).some((cookie) => cookie.startsWith(`me_cookie=`))).toBe(true);
  });

  it(`returns a controlled network error when upstream me fetch fails`, async () => {
    mockFetch.mockRejectedValueOnce(new Error(`network down`));

    const response = await GET(new Request(`https://app.example.com/api/me`) as unknown as NextRequest);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      code: `NETWORK_ERROR`,
      message: `The upstream API request failed. Please try again.`,
    });
  });
});
