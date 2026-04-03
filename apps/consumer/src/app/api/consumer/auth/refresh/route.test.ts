import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { POST } from './route';
import { getSetCookieValues } from '../../../../../lib/api-utils';

type MockFetch = jest.MockedFunction<typeof fetch>;

describe(`refresh route`, () => {
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

  it(`forwards refresh cookies and csrf while dropping incoming authorization headers and host`, async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          [`set-cookie`]: `refresh_cookie=ok; Path=/; HttpOnly`,
        },
      }),
    );

    const request = new Request(`https://app.example.com/api/consumer/auth/refresh`, {
      method: `POST`,
      headers: {
        authorization: `legacy-token`,
        cookie: `refresh_cookie=token; csrf_token=csrf`,
        host: `app.example.com`,
        'x-csrf-token': `csrf`,
      },
    });

    const response = await POST(request as never);
    const forwardedHeaders = mockFetch.mock.calls[0]?.[1]?.headers as Headers | undefined;

    expect(response.status).toBe(200);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://api.example.com/consumer/auth/refresh`);
    expect(forwardedHeaders?.get(`authorization`)).toBeNull();
    expect(forwardedHeaders?.get(`host`)).toBeNull();
    expect(forwardedHeaders?.get(`cookie`)).toBe(`refresh_cookie=token; csrf_token=csrf`);
    expect(forwardedHeaders?.get(`x-csrf-token`)).toBe(`csrf`);
    expect(getSetCookieValues(response.headers).some((cookie) => cookie.startsWith(`refresh_cookie=`))).toBe(true);
  });
});
