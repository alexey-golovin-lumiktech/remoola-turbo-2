import { GET } from './route';
import { getEnv } from '../../../../lib/env.server';
import { TEST_APP_ORIGIN, TEST_BROWSER_ORIGIN } from '../../../../test-constants';

jest.mock(`../../../../lib/env.server`, () => ({
  getEnv: jest.fn(),
}));

describe(`consumer-mobile payments/[paymentRequestId] route`, () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    (getEnv as jest.Mock).mockReturnValue({ NEXT_PUBLIC_API_BASE_URL: `https://api.example.com` });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it(`returns 400 VALIDATION_ERROR for invalid route params`, async () => {
    const req = new Request(`${TEST_APP_ORIGIN}/api/payments/`, { method: `GET` });

    const res = await GET(req as never, { params: Promise.resolve({ paymentRequestId: `` }) });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ code: `VALIDATION_ERROR` });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it(`proxies response and preserves cookies`, async () => {
    const upstream = new Response(`{"ok":true}`, { status: 200, headers: { 'content-type': `application/json` } });
    (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie = () => [
      `a=1; Path=/; HttpOnly`,
      `b=2; Path=/; HttpOnly`,
    ];
    (global.fetch as jest.Mock).mockResolvedValue(upstream);

    const req = new Request(`${TEST_BROWSER_ORIGIN}/api/payments/pr_1`, {
      method: `GET`,
      headers: {
        origin: TEST_BROWSER_ORIGIN,
        cookie: `csrf_token=abc`,
        'x-remoola-test': `on`,
        'x-forwarded-for': `10.0.0.1`,
      },
    });

    const res = await GET(req as never, { params: Promise.resolve({ paymentRequestId: `pr_1` }) });

    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe(`{"ok":true}`);

    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get(`origin`)).toBe(TEST_BROWSER_ORIGIN);
    expect(headers.get(`x-remoola-test`)).toBe(`on`);
    expect(headers.get(`x-forwarded-for`)).toBeNull();

    const getSetCookie = (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
    if (typeof getSetCookie === `function`) {
      expect(getSetCookie.call(res.headers)).toEqual([`a=1; Path=/; HttpOnly`, `b=2; Path=/; HttpOnly`]);
      return;
    }
    expect(res.headers.get(`set-cookie`)).toContain(`a=1`);
    expect(res.headers.get(`set-cookie`)).toContain(`b=2`);
  });
});
