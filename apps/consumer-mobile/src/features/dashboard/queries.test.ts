import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { getDashboardData } from './queries';

type MockFetch = jest.MockedFunction<typeof fetch>;

const validDashboard = {
  summary: {
    balanceCents: 1200,
    activeRequests: 2,
    lastPaymentAt: null,
  },
  pendingRequests: [],
  activity: [],
  tasks: [],
  quickDocs: [],
  verification: {
    status: `pending`,
    canStart: true,
    profileComplete: false,
    legalVerified: false,
    effectiveVerified: false,
    reviewStatus: `not_started`,
    stripeStatus: `not_started`,
    sessionId: null,
    lastErrorCode: null,
    lastErrorReason: null,
    startedAt: null,
    updatedAt: null,
    verifiedAt: null,
  },
};

describe(`dashboard queries`, () => {
  const originalFetch = global.fetch;
  const originalApiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  let mockFetch: MockFetch;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = `https://api.example.com`;
    mockFetch = jest.fn() as MockFetch;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBase;
  });

  it(`forwards cookie auth context with trusted origin`, async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(validDashboard), {
        status: 200,
        headers: { 'content-type': `application/json` },
      }),
    );

    const result = await getDashboardData(`consumer_mobile_access_token=abc`);

    expect(result).toEqual(validDashboard);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.Cookie).toBe(`consumer_mobile_access_token=abc`);
    expect(headers.origin).toBe(`http://localhost:3002`);
  });

  it(`returns null for unauthorized dashboard responses`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ error: `Unauthorized` }), { status: 401 }));

    await expect(getDashboardData(`consumer_mobile_access_token=abc`)).resolves.toBeNull();
  });
});
