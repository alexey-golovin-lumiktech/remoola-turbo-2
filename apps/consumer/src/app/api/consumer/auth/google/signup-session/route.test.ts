import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { GET } from './route';
import { getSetCookieValues } from '../../../../../../lib/api-utils';

type MockFetch = jest.MockedFunction<typeof fetch>;

describe(`google signup-session route`, () => {
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

  it(`forwards signup-session request without query token and replays set-cookie headers`, async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ email: `new-user@example.com` }), {
        status: 200,
        headers: {
          [`set-cookie`]: `google_signup=token; Path=/; HttpOnly`,
        },
      }),
    );

    const request = {
      nextUrl: new URL(`https://app.example.com/api/consumer/auth/google/signup-session`),
      headers: new Headers({
        cookie: `csrf_token=csrf`,
      }),
    };

    const response = await GET(request as never);
    const forwardedHeaders = mockFetch.mock.calls[0]?.[1]?.headers as Headers | undefined;

    expect(response.status).toBe(200);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://api.example.com/consumer/auth/google/signup-session`);
    expect(forwardedHeaders?.get(`cookie`)).toBe(`csrf_token=csrf`);
    expect(getSetCookieValues(response.headers)).toContain(`google_signup=token; Path=/; HttpOnly`);
    await expect(response.text()).resolves.toBe(`{"email":"new-user@example.com"}`);
  });
});
