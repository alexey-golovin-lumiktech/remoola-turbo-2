import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { POST } from './route';

type MockFetch = jest.MockedFunction<typeof fetch>;

describe(`consumer-css-grid forgot-password route`, () => {
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

  it(`forwards forgot-password requests to the canonical backend path`, async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: `If an account exists, we sent recovery instructions.` }), {
        status: 200,
      }),
    );

    const request = new Request(`https://grid.example.com/api/consumer/auth/forgot-password`, {
      method: `POST`,
      headers: {
        'content-type': `application/json`,
        origin: `https://grid.example.com`,
        host: `grid.example.com`,
      },
      body: JSON.stringify({ email: `user@example.com` }),
    });

    const response = await POST(request as never);
    const forwardedHeaders = mockFetch.mock.calls[0]?.[1]?.headers as Headers | undefined;

    expect(response.status).toBe(200);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://api.example.com/consumer/auth/forgot-password`);
    expect(forwardedHeaders?.get(`origin`)).toBe(`https://grid.example.com`);
    expect(forwardedHeaders?.get(`host`)).toBeNull();
    expect(mockFetch.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ email: `user@example.com` }));
  });
});
