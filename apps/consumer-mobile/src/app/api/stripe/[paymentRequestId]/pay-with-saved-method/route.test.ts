import { POST } from './route';
import { getEnv } from '../../../../../lib/env.server';
import { TEST_APP_ORIGIN, TEST_BROWSER_ORIGIN } from '../../../../../test-constants';

jest.mock(`../../../../../lib/env.server`, () => ({
  getEnv: jest.fn(),
}));

describe(`consumer-mobile stripe pay-with-saved-method route`, () => {
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
    const req = new Request(`${TEST_APP_ORIGIN}/api/stripe//pay-with-saved-method`, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      body: JSON.stringify({ paymentMethodId: `pm_123` }),
    });

    const res = await POST(req as never, { params: Promise.resolve({ paymentRequestId: `` }) });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ code: `VALIDATION_ERROR` });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it(`forwards idempotency-key and preserves set-cookie headers`, async () => {
    const upstream = new Response(`{"ok":true}`, { status: 200, headers: { 'content-type': `application/json` } });
    (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie = () => [
      `__Host-access_token=abc; Path=/; HttpOnly`,
      `csrf_token=def; Path=/`,
    ];
    (global.fetch as jest.Mock).mockResolvedValue(upstream);

    const req = new Request(`${TEST_BROWSER_ORIGIN}/api/stripe/pr_1/pay-with-saved-method`, {
      method: `POST`,
      headers: {
        'content-type': `application/json`,
        cookie: `csrf_token=aaa`,
        origin: TEST_BROWSER_ORIGIN,
        'idempotency-key': `idem-key-123`,
      },
      body: JSON.stringify({ paymentMethodId: `pm_123` }),
    });

    const res = await POST(req as never, { params: Promise.resolve({ paymentRequestId: `pr_1` }) });
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe(`{"ok":true}`);

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe(
      `https://api.example.com/consumer/stripe/pr_1/pay-with-saved-method?appScope=consumer-mobile`,
    );
    const headers = init.headers as Headers;
    expect(headers.get(`idempotency-key`)).toBe(`idem-key-123`);
    expect(headers.get(`cookie`)).toBe(`csrf_token=aaa`);
    expect(headers.get(`origin`)).toBe(TEST_BROWSER_ORIGIN);

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
