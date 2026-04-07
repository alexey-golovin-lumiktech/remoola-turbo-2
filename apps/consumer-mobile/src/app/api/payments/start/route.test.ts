import { POST } from './route';
import { getEnv } from '../../../../lib/env.server';
import { TEST_BROWSER_ORIGIN } from '../../../../test-constants';

jest.mock(`../../../../lib/env.server`, () => ({
  getEnv: jest.fn(),
}));

jest.mock(`../../../../lib/logger.server`, () => ({
  serverLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe(`consumer-mobile payments start route`, () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    (getEnv as jest.Mock).mockReturnValue({ NEXT_PUBLIC_API_BASE_URL: `https://api.example.com` });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it(`forwards the start-payment request with explicit mobile app scope`, async () => {
    const upstream = new Response(`{"ok":true}`, { status: 200, headers: { 'content-type': `application/json` } });
    (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie = () => [
      `__Host-access_token=abc; Path=/; HttpOnly`,
    ];
    (global.fetch as jest.Mock).mockResolvedValue(upstream);

    const req = new Request(`${TEST_BROWSER_ORIGIN}/api/payments/start`, {
      method: `POST`,
      headers: {
        'content-type': `application/json`,
        cookie: `csrf_token=aaa`,
        origin: TEST_BROWSER_ORIGIN,
      },
      body: JSON.stringify({ email: `payer@example.com`, amount: `10`, currencyCode: `USD`, method: `CREDIT_CARD` }),
    });

    const res = await POST(req as never);

    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe(`{"ok":true}`);

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe(`https://api.example.com/consumer/payments/start?appScope=consumer-mobile`);
    const headers = init.headers as Headers;
    expect(headers.get(`cookie`)).toBe(`csrf_token=aaa`);
  });
});
