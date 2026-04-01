import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { type NextRequest } from 'next/server';

import { POST } from './route';
import { getSetCookieValues } from '../../../../lib/api-utils';

type MockFetch = jest.MockedFunction<typeof fetch>;

describe(`documents upload route`, () => {
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

  it(`forwards upload headers while stripping authorization and host`, async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(`uploaded`, {
        status: 201,
        headers: {
          [`set-cookie`]: `upload_cookie=ok; Path=/; HttpOnly`,
        },
      }),
    );

    const request = new Request(`https://app.example.com/api/documents/upload`, {
      method: `POST`,
      headers: {
        authorization: `Bearer can-forward`,
        cookie: `consumer_session=session-cookie`,
        'content-type': `multipart/form-data; boundary=test-boundary`,
        host: `app.example.com`,
      },
      body: `--test-boundary--`,
      duplex: `half`,
    } as RequestInit);

    const response = await POST(request as unknown as NextRequest);
    const forwardedHeaders = mockFetch.mock.calls[0]?.[1]?.headers as Headers | undefined;
    const fetchOptions = mockFetch.mock.calls[0]?.[1] as (RequestInit & { duplex?: string }) | undefined;

    expect(response.status).toBe(201);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://api.example.com/consumer/documents/upload`);
    expect(fetchOptions?.credentials).toBe(`include`);
    expect(fetchOptions?.duplex).toBe(`half`);
    expect(forwardedHeaders?.get(`authorization`)).toBeNull();
    expect(forwardedHeaders?.get(`cookie`)).toBe(`consumer_session=session-cookie`);
    expect(forwardedHeaders?.get(`content-type`)).toContain(`multipart/form-data`);
    expect(forwardedHeaders?.get(`host`)).toBeNull();
    expect(getSetCookieValues(response.headers).some((cookie) => cookie.startsWith(`upload_cookie=`))).toBe(true);
  });
});
