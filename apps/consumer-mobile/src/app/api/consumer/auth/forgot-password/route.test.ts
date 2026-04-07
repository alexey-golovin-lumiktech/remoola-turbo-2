import { describe, expect, it, jest } from '@jest/globals';

import { POST } from './route';
import { TEST_APP_ORIGIN, TEST_BROWSER_ORIGIN } from '../../../../../test-constants';

describe(`POST /api/consumer/auth/forgot-password`, () => {
  it(`forwards forgot-password requests to the canonical backend path`, async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = `https://api.example.com`;
    const fetchSpy = jest.spyOn(global, `fetch`).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: `If an account exists, we sent recovery instructions.` }), {
        status: 200,
      }),
    );

    const req = new Request(`${TEST_BROWSER_ORIGIN}/api/consumer/auth/forgot-password`, {
      method: `POST`,
      headers: {
        'content-type': `application/json`,
        origin: TEST_BROWSER_ORIGIN,
      },
      body: JSON.stringify({ email: `u@e.com` }),
    });

    const res = await POST(req as never);
    const forwardedHeaders = fetchSpy.mock.calls[0]?.[1]?.headers as Headers | undefined;

    expect(res.status).toBe(200);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
      `https://api.example.com/consumer/auth/forgot-password?appScope=consumer-mobile`,
    );
    expect(forwardedHeaders?.get(`origin`)).toBe(TEST_BROWSER_ORIGIN);
    expect(fetchSpy.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ email: `u@e.com` }));

    fetchSpy.mockRestore();
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });
});
