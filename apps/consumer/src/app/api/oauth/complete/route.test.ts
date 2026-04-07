import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { getConsumerCsrfTokenCookieKeysForRead } from '@remoola/api-types';

import { POST } from './route';
import { getSetCookieValues } from '../../../../lib/api-utils';

type MockFetch = jest.MockedFunction<typeof fetch>;

describe(`consumer oauth complete route`, () => {
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

  it(`proxies oauth completion with origin and inferred csrf header`, async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, next: `/dashboard` }), {
        status: 200,
        headers: {
          [`set-cookie`]: `oauth_cookie=ok; Path=/; HttpOnly`,
        },
      }),
    );

    const request = new Request(`https://app.example.com/api/oauth/complete`, {
      method: `POST`,
      headers: {
        'content-type': `application/json`,
        cookie: `consumer_session=session-cookie; ${getConsumerCsrfTokenCookieKeysForRead()[0]}=csrf-cookie`,
        origin: `https://app.example.com`,
      },
      body: JSON.stringify({ handoffToken: `handoff-123` }),
    });

    const response = await POST(request);
    const forwardedHeaders = mockFetch.mock.calls[0]?.[1]?.headers as Headers | undefined;

    expect(response.status).toBe(200);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(
      `https://api.example.com/consumer/auth/oauth/complete?appScope=consumer`,
    );
    expect(forwardedHeaders?.get(`origin`)).toBe(`https://app.example.com`);
    expect(forwardedHeaders?.get(`x-csrf-token`)).toBe(`csrf-cookie`);
    expect(getSetCookieValues(response.headers).some((cookie) => cookie.startsWith(`oauth_cookie=`))).toBe(true);
  });

  it(`rejects invalid json before touching the backend`, async () => {
    const request = new Request(`https://app.example.com/api/oauth/complete`, {
      method: `POST`,
      headers: {
        'content-type': `application/json`,
      },
      body: `{invalid-json`,
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
