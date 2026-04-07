const proxyApiRequest = jest.fn();
const handleApiError = jest.fn();

jest.mock(`../../../../../lib/api-utils`, () => ({
  proxyApiRequest: (...args: unknown[]) => proxyApiRequest(...args),
  handleApiError: (...args: unknown[]) => handleApiError(...args),
}));

jest.mock(`../../../../../lib/env.server`, () => ({
  getEnv: jest.fn(() => ({ NEXT_PUBLIC_API_BASE_URL: `https://api.example.com` })),
}));

import { POST } from './route';
import { TEST_APP_ORIGIN } from '../../../../../test-constants';

describe(`consumer-mobile payment-request send route`, () => {
  beforeEach(() => {
    proxyApiRequest.mockResolvedValue(new Response(null, { status: 204 }));
    handleApiError.mockImplementation((error: unknown) => {
      throw error;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it(`forwards explicit consumer-mobile appScope to the backend send endpoint`, async () => {
    const req = new Request(`${TEST_APP_ORIGIN}/api/payment-requests/pr_1/send`, { method: `POST` });

    const res = await POST(req as never, { params: Promise.resolve({ paymentRequestId: `pr_1` }) });

    expect(res.status).toBe(204);
    expect(proxyApiRequest).toHaveBeenCalledWith(
      `https://api.example.com/consumer/payment-requests/pr_1/send?appScope=consumer-mobile`,
      req,
      { timeout: 20000, retries: 2 },
    );
  });
});
