import { POST } from './route';

const TEST_ORIGIN = `http://localhost:3001`;

describe(`consumer stripe-session route`, () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
  const originalConsumerAppOrigin = process.env.CONSUMER_APP_ORIGIN;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = `https://api.example.com`;
    process.env.CONSUMER_APP_ORIGIN = `https://consumer.example.com`;
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response(`{"url":"https://checkout.example/session"}`, { status: 200 }));
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv;
    process.env.CONSUMER_APP_ORIGIN = originalConsumerAppOrigin;
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it(`forwards explicit consumer appScope to the backend stripe-session endpoint`, async () => {
    const req = new Request(`${TEST_ORIGIN}/api/stripe/pr_1/stripe-session`, {
      method: `POST`,
      headers: {
        cookie: `csrf_token=aaa`,
        origin: TEST_ORIGIN,
      },
    });

    const res = await POST(req as never, { params: Promise.resolve({ paymentRequestId: `pr_1` }) });

    expect(res.status).toBe(200);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe(`https://api.example.com/consumer/stripe/pr_1/stripe-session?appScope=consumer`);
    const headers = init.headers as Headers;
    expect(headers.get(`origin`)).toBe(TEST_ORIGIN);
  });
});
