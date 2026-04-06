import { POST } from './route';
import { getSetCookieValues } from '../../../lib/api-utils';
import { getEnv } from '../../../lib/env.server';
import { TEST_APP_ORIGIN } from '../../../test-constants';

jest.mock(`../../../lib/env.server`, () => ({
  getEnv: jest.fn(),
}));

describe(`POST /api/signup`, () => {
  it(`triggers canonical completion follow-up after successful signup`, async () => {
    (getEnv as jest.Mock).mockReturnValue({ NEXT_PUBLIC_API_BASE_URL: `https://api.example.com` });
    const fetchSpy = jest
      .spyOn(global, `fetch`)
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

    const req = new Request(`${TEST_APP_ORIGIN}/api/signup`, {
      method: `POST`,
      headers: {
        'content-type': `application/json`,
        cookie: `consumer_session=session-cookie`,
        origin: TEST_APP_ORIGIN,
        host: `localhost:3002`,
      },
      body: JSON.stringify({ email: `new@example.com`, password: `Password1!` }),
    });

    const res = await POST(req as never);
    const setCookies = getSetCookieValues(res.headers);
    const firstRequestHeaders = fetchSpy.mock.calls[0]?.[1]?.headers as Headers | undefined;
    const secondRequestHeaders = fetchSpy.mock.calls[1]?.[1]?.headers as Headers | undefined;

    expect(res.status).toBe(201);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(`https://api.example.com/consumer/auth/signup`);
    expect(String(fetchSpy.mock.calls[1]?.[0])).toBe(
      `https://api.example.com/consumer/auth/signup/consumer-123/complete-profile-creation`,
    );
    expect(fetchSpy.mock.calls[1]?.[1]?.method).toBe(`GET`);
    expect(firstRequestHeaders?.get(`origin`)).toBe(TEST_APP_ORIGIN);
    expect(firstRequestHeaders?.get(`host`)).toBeNull();
    expect(secondRequestHeaders?.get(`origin`)).toBe(TEST_APP_ORIGIN);
    expect(secondRequestHeaders?.get(`host`)).toBeNull();
    expect(secondRequestHeaders?.get(`cookie`)).toBe(`consumer_session=session-cookie`);
    expect(setCookies.some((cookie) => cookie.startsWith(`signup_cookie=`))).toBe(true);
    expect(setCookies.some((cookie) => cookie.startsWith(`completion_cookie=`))).toBe(true);

    fetchSpy.mockRestore();
  });
});
