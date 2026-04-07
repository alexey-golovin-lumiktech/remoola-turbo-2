import { POST } from './route';
import { getEnv } from '../../../../../lib/env.server';
import { TEST_APP_ORIGIN, TEST_BROWSER_ORIGIN } from '../../../../../test-constants';

jest.mock(`../../../../../lib/env.server`, () => ({
  getEnv: jest.fn(),
}));

describe(`consumer-mobile stripe-session route`, () => {
  const originalConsumerMobileAppOrigin = process.env.CONSUMER_MOBILE_APP_ORIGIN;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.CONSUMER_MOBILE_APP_ORIGIN = `https://consumer-mobile.example.com`;
    (getEnv as jest.Mock).mockReturnValue({ NEXT_PUBLIC_API_BASE_URL: `https://api.example.com` });
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response(`{"url":"https://checkout.example/session"}`, { status: 200 }));
  });

  afterEach(() => {
    process.env.CONSUMER_MOBILE_APP_ORIGIN = originalConsumerMobileAppOrigin;
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it(`forwards explicit consumer-mobile appScope to the backend stripe-session endpoint`, async () => {
    const req = new Request(`${TEST_BROWSER_ORIGIN}/api/stripe/pr_1/stripe-session`, {
      method: `POST`,
      headers: {
        cookie: `csrf_token=aaa`,
        origin: TEST_BROWSER_ORIGIN,
      },
    });

    const res = await POST(req as never, { params: Promise.resolve({ paymentRequestId: `pr_1` }) });

    expect(res.status).toBe(200);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe(`https://api.example.com/consumer/stripe/pr_1/stripe-session?appScope=consumer-mobile`);
    const headers = init.headers as Headers;
    expect(headers.get(`origin`)).toBe(TEST_BROWSER_ORIGIN);
  });
});
