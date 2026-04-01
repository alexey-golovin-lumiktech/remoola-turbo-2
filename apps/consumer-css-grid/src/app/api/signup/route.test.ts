import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { POST } from './route';
import { getSetCookieValues } from '../../../lib/api-utils';

type MockFetch = jest.MockedFunction<typeof fetch>;

describe(`signup route`, () => {
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

  it(`triggers proxied completion after successful signup`, async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ consumer: { id: `consumer-123`, email: `new@example.com` } }), {
          status: 201,
          headers: {
            [`set-cookie`]: `signup_cookie=ok; Path=/; HttpOnly`,
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(`ok`, {
          status: 200,
          headers: {
            [`set-cookie`]: `completion_cookie=ok; Path=/; HttpOnly`,
          },
        }),
      );

    const request = new Request(`https://app.example.com/api/signup`, {
      method: `POST`,
      headers: {
        authorization: `Bearer should-not-forward`,
        'content-type': `application/json`,
        cookie: `consumer_session=session-cookie`,
        host: `app.example.com`,
      },
      body: JSON.stringify({ email: `new@example.com`, password: `Password1!` }),
    });

    const response = await POST(request as any);
    const setCookies = getSetCookieValues(response.headers);

    expect(response.status).toBe(201);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://api.example.com/consumer/auth/signup`);
    expect(String(mockFetch.mock.calls[1]?.[0])).toBe(
      `https://api.example.com/consumer/auth/signup/consumer-123/complete-profile-creation`,
    );
    expect(mockFetch.mock.calls[1]?.[1]?.method).toBe(`GET`);
    const firstRequestHeaders = mockFetch.mock.calls[0]?.[1]?.headers as Headers | undefined;
    expect(firstRequestHeaders?.get(`authorization`)).toBeNull();
    expect(firstRequestHeaders?.get(`host`)).toBeNull();
    const secondRequestHeaders = mockFetch.mock.calls[1]?.[1]?.headers as Headers | undefined;
    expect(secondRequestHeaders?.get(`authorization`)).toBeNull();
    expect(secondRequestHeaders?.get(`host`)).toBeNull();
    expect(secondRequestHeaders?.get(`cookie`)).toBe(`consumer_session=session-cookie`);
    expect(setCookies.some((cookie) => cookie.startsWith(`signup_cookie=`))).toBe(true);
    expect(setCookies.some((cookie) => cookie.startsWith(`completion_cookie=`))).toBe(true);
  });
});
