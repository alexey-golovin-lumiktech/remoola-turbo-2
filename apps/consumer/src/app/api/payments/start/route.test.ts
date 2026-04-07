import { POST } from './route';

const TEST_ORIGIN = `http://localhost:3001`;

describe(`consumer payments start route`, () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = `https://api.example.com`;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv;
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it(`forwards the start-payment request with explicit consumer app scope`, async () => {
    const upstream = new Response(`{"ok":true}`, { status: 200, headers: { 'content-type': `application/json` } });
    (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie = () => [
      `__Host-access_token=abc; Path=/; HttpOnly`,
    ];
    (global.fetch as jest.Mock).mockResolvedValue(upstream);

    const req = new Request(`${TEST_ORIGIN}/api/payments/start`, {
      method: `POST`,
      headers: {
        'content-type': `application/json`,
        cookie: `csrf_token=aaa`,
        origin: TEST_ORIGIN,
      },
      body: JSON.stringify({ email: `payer@example.com`, amount: `10`, currencyCode: `USD`, method: `CREDIT_CARD` }),
    });

    const res = await POST(req as never);

    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe(`{"ok":true}`);

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe(`https://api.example.com/consumer/payments/start?appScope=consumer`);
    const headers = init.headers as Headers;
    expect(headers.get(`cookie`)).toBe(`csrf_token=aaa`);
  });
});
