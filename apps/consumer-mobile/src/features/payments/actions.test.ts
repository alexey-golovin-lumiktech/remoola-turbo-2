import { revalidatePath } from 'next/cache';

import { startPaymentAction } from './actions';
import { getEnv } from '../../lib/env.server';
import { getServerActionMutationAuthHeaders } from '../../lib/server-action-auth';

jest.mock(`next/cache`, () => ({
  revalidatePath: jest.fn(),
}));

jest.mock(`../../lib/env.server`, () => ({
  getEnv: jest.fn(),
}));

jest.mock(`../../lib/logger.server`, () => ({
  generateCorrelationId: jest.fn(() => `corr-1`),
  serverLogger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    auditLog: jest.fn(),
  },
}));

jest.mock(`../../lib/server-action-auth`, () => ({
  getServerActionMutationAuthHeaders: jest.fn(),
}));

describe(`startPaymentAction`, () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    (getEnv as jest.Mock).mockReturnValue({ NEXT_PUBLIC_API_BASE_URL: `https://api.example.com` });
    (getServerActionMutationAuthHeaders as jest.Mock).mockResolvedValue({ cookie: `consumer_session=test-cookie` });
    (revalidatePath as jest.Mock).mockClear();
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ paymentRequestId: `pr_1` }), {
        status: 200,
        headers: { 'content-type': `application/json` },
      }) as unknown as typeof fetch,
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it(`sends explicit mobile app scope to the backend`, async () => {
    const result = await startPaymentAction({
      amount: 10,
      currencyCode: `USD`,
    });

    expect(result).toEqual({ ok: true });
    const [url, request] = (global.fetch as jest.Mock).mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe(`https://api.example.com/consumer/payments/start?appScope=consumer-mobile`);
    expect(request.body).toBe(JSON.stringify({ amount: 10, currencyCode: `USD` }));
    expect(revalidatePath).toHaveBeenCalledWith(`/payments`);
  });
});
