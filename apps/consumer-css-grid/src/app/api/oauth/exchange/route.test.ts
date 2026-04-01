import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { POST } from './route';
import { getSetCookieValues } from '../../../../lib/api-utils';

type MockFetch = jest.MockedFunction<typeof fetch>;

describe(`oauth exchange route`, () => {
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

  it(`forwards oauth exchange payload while stripping authorization and host headers`, async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          [`set-cookie`]: `oauth_cookie=ok; Path=/; HttpOnly`,
        },
      }),
    );

    const request = new Request(`https://app.example.com/api/oauth/exchange`, {
      method: `POST`,
      headers: {
        authorization: `Bearer should-not-forward`,
        'content-type': `application/json`,
        cookie: `consumer_session=session-cookie`,
        host: `app.example.com`,
      },
      body: JSON.stringify({ oauthToken: `token-1` }),
    });

    const response = await POST(request);
    const forwardedHeaders = mockFetch.mock.calls[0]?.[1]?.headers as Headers | undefined;

    expect(response.status).toBe(200);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://api.example.com/consumer/auth/oauth/exchange`);
    expect(forwardedHeaders?.get(`authorization`)).toBeNull();
    expect(forwardedHeaders?.get(`host`)).toBeNull();
    expect(forwardedHeaders?.get(`cookie`)).toBe(`consumer_session=session-cookie`);
    expect(getSetCookieValues(response.headers).some((cookie) => cookie.startsWith(`oauth_cookie=`))).toBe(true);
  });
});
