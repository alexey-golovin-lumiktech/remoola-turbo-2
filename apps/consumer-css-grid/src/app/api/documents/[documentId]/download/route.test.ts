import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { type NextRequest } from 'next/server';

import { GET } from './route';
import { getSetCookieValues } from '../../../../../lib/api-utils';

type MockFetch = jest.MockedFunction<typeof fetch>;

describe(`documents download route`, () => {
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

  it(`forwards scoped auth headers and preserves file response headers`, async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(`file-bytes`, {
        status: 200,
        headers: {
          [`cache-control`]: `private, no-store`,
          [`content-disposition`]: `inline; filename="contract.pdf"`,
          [`content-length`]: `10`,
          [`content-type`]: `application/pdf`,
          [`set-cookie`]: `download_cookie=ok; Path=/; HttpOnly`,
        },
      }),
    );

    const request = new Request(`https://app.example.com/api/documents/resource-1/download`, {
      method: `GET`,
      headers: {
        cookie: `consumer_session=session-cookie`,
        host: `app.example.com`,
      },
    });

    const response = await GET(request as unknown as NextRequest, {
      params: Promise.resolve({ documentId: `resource-1` }),
    });
    const forwardedHeaders = mockFetch.mock.calls[0]?.[1]?.headers as Headers | undefined;

    expect(response.status).toBe(200);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://api.example.com/consumer/documents/resource-1/download`);
    expect(forwardedHeaders?.get(`cookie`)).toBe(`consumer_session=session-cookie`);
    expect(forwardedHeaders?.get(`host`)).toBeNull();
    expect(response.headers.get(`content-type`)).toBe(`application/pdf`);
    expect(response.headers.get(`content-disposition`)).toBe(`inline; filename="contract.pdf"`);
    expect(getSetCookieValues(response.headers).some((cookie) => cookie.startsWith(`download_cookie=`))).toBe(true);
  });
});
