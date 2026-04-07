import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { POST } from './route';
import { getSetCookieValues } from '../../../lib/api-utils';

type MockFetch = jest.MockedFunction<typeof fetch>;

describe(`consumer signup route`, () => {
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

  it(`triggers canonical completion follow-up after successful signup`, async () => {
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
        'content-type': `application/json`,
        cookie: `consumer_session=session-cookie`,
        origin: `https://app.example.com`,
        host: `app.example.com`,
      },
      body: JSON.stringify({ email: `new@example.com`, password: `Password1!` }),
    });

    const response = await POST(request as never);
    const setCookies = getSetCookieValues(response.headers);
    const firstRequestHeaders = mockFetch.mock.calls[0]?.[1]?.headers as Headers | undefined;
    const secondRequestHeaders = mockFetch.mock.calls[1]?.[1]?.headers as Headers | undefined;

    expect(response.status).toBe(201);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://api.example.com/consumer/auth/signup?appScope=consumer`);
    expect(String(mockFetch.mock.calls[1]?.[0])).toBe(
      `https://api.example.com/consumer/auth/signup/consumer-123/complete-profile-creation?appScope=consumer`,
    );
    expect(mockFetch.mock.calls[1]?.[1]?.method).toBe(`GET`);
    expect(firstRequestHeaders?.get(`origin`)).toBe(`https://app.example.com`);
    expect(firstRequestHeaders?.get(`host`)).toBeNull();
    expect(secondRequestHeaders?.get(`origin`)).toBe(`https://app.example.com`);
    expect(secondRequestHeaders?.get(`host`)).toBeNull();
    expect(secondRequestHeaders?.get(`cookie`)).toBe(`consumer_session=session-cookie`);
    expect(setCookies.some((cookie) => cookie.startsWith(`signup_cookie=`))).toBe(true);
    expect(setCookies.some((cookie) => cookie.startsWith(`completion_cookie=`))).toBe(true);
  });

  it(`does not call complete-profile-creation when api returns Google signup next path`, async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          consumer: { id: `consumer-google`, email: `g@example.com` },
          next: `/dashboard`,
        }),
        {
          status: 201,
          headers: {
            [`set-cookie`]: `auth_cookie=ok; Path=/; HttpOnly`,
          },
        },
      ),
    );

    const request = new Request(`https://app.example.com/api/signup`, {
      method: `POST`,
      headers: {
        'content-type': `application/json`,
        cookie: `consumer_session=session-cookie`,
        origin: `https://app.example.com`,
        host: `app.example.com`,
      },
      body: JSON.stringify({ email: `g@example.com`, accountType: `BUSINESS` }),
    });

    const response = await POST(request as never);
    const setCookies = getSetCookieValues(response.headers);
    const firstRequestHeaders = mockFetch.mock.calls[0]?.[1]?.headers as Headers | undefined;

    expect(response.status).toBe(201);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://api.example.com/consumer/auth/signup?appScope=consumer`);
    expect(firstRequestHeaders?.get(`origin`)).toBe(`https://app.example.com`);
    expect(firstRequestHeaders?.get(`host`)).toBeNull();
    expect(setCookies.some((cookie) => cookie.startsWith(`auth_cookie=`))).toBe(true);
  });
});
