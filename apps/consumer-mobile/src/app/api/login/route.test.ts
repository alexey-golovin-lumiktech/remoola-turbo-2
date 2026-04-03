import { POST } from './route';
import { getSetCookieValues } from '../../../lib/api-utils';
import { getEnv } from '../../../lib/env.server';
import { TEST_APP_ORIGIN, TEST_CSRF_COOKIE_KEY } from '../../../test-constants';

jest.mock(`../../../lib/env.server`, () => ({
  getEnv: jest.fn(),
}));

describe(`POST /api/login`, () => {
  it(`returns 503 when API base URL is not configured`, async () => {
    (getEnv as jest.Mock).mockReturnValue({ NEXT_PUBLIC_API_BASE_URL: undefined });
    const req = new Request(`${TEST_APP_ORIGIN}/api/login`, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      body: JSON.stringify({ email: `u@e.com`, password: `p` }),
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.code).toBe(`CONFIG_ERROR`);
  });

  it(`forwards origin and inferred csrf token to backend login`, async () => {
    (getEnv as jest.Mock).mockReturnValue({ NEXT_PUBLIC_API_BASE_URL: `https://api.example.com` });
    const fetchSpy = jest.spyOn(global, `fetch`).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { [`set-cookie`]: `login_cookie=ok; Path=/; HttpOnly` },
      }),
    );

    const req = new Request(`${TEST_APP_ORIGIN}/api/login`, {
      method: `POST`,
      headers: {
        'content-type': `application/json`,
        cookie: `consumer_session=session-cookie; ${TEST_CSRF_COOKIE_KEY}=csrf-cookie`,
        origin: TEST_APP_ORIGIN,
      },
      body: JSON.stringify({ email: `u@e.com`, password: `p` }),
    });

    const res = await POST(req);
    const forwardedHeaders = fetchSpy.mock.calls[0]?.[1]?.headers as Headers | undefined;

    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(`https://api.example.com/consumer/auth/login`);
    expect(forwardedHeaders?.get(`origin`)).toBe(TEST_APP_ORIGIN);
    expect(forwardedHeaders?.get(`x-csrf-token`)).toBe(`csrf-cookie`);
    expect(getSetCookieValues(res.headers).some((cookie) => cookie.startsWith(`login_cookie=`))).toBe(true);

    fetchSpy.mockRestore();
  });
});
