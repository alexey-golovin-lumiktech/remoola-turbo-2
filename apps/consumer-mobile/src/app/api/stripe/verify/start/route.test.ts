import { POST } from './route';
import { getEnv } from '../../../../../lib/env.server';
import { TEST_APP_ORIGIN } from '../../../../../test-constants';

jest.mock(`../../../../../lib/env.server`, () => ({
  getEnv: jest.fn(),
}));

describe(`consumer-mobile stripe verify start route`, () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    (getEnv as jest.Mock).mockReturnValue({ NEXT_PUBLIC_API_BASE_URL: `https://api.example.com` });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it(`returns 503 when API base URL is not configured`, async () => {
    (getEnv as jest.Mock).mockReturnValue({ NEXT_PUBLIC_API_BASE_URL: undefined });
    const req = new Request(`${TEST_APP_ORIGIN}/api/stripe/verify/start`, { method: `POST` });

    const res = await POST(req as never);

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ code: `CONFIG_ERROR` });
  });

  it(`proxies verification session creation and preserves cookies`, async () => {
    const upstream = new Response(`{"clientSecret":"secret","sessionId":"vs_123"}`, {
      status: 200,
      headers: { 'content-type': `application/json` },
    });
    (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie = () => [
      `__Host-access_token=abc; Path=/; HttpOnly`,
      `csrf_token=def; Path=/`,
    ];
    (global.fetch as jest.Mock).mockResolvedValue(upstream);

    const req = new Request(`${TEST_APP_ORIGIN}/api/stripe/verify/start`, {
      method: `POST`,
      headers: {
        cookie: `csrf_token=abc`,
        origin: TEST_APP_ORIGIN,
      },
    });

    const res = await POST(req as never);

    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe(`{"clientSecret":"secret","sessionId":"vs_123"}`);

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe(`https://api.example.com/consumer/verification/sessions`);
    const headers = init.headers as Headers;
    expect(headers.get(`cookie`)).toBe(`csrf_token=abc`);
    expect(headers.get(`origin`)).toBe(TEST_APP_ORIGIN);

    const getSetCookie = (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
    if (typeof getSetCookie === `function`) {
      expect(getSetCookie.call(res.headers)).toEqual([
        `__Host-access_token=abc; Path=/; HttpOnly`,
        `csrf_token=def; Path=/`,
      ]);
      return;
    }

    expect(res.headers.get(`set-cookie`)).toContain(`__Host-access_token=abc`);
    expect(res.headers.get(`set-cookie`)).toContain(`csrf_token=def`);
  });
});
