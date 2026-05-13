import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock(`next/headers`, () => ({
  cookies: jest.fn(),
}));

jest.mock(`next/navigation`, () => ({
  redirect: jest.fn(),
}));

jest.mock(`./env.server`, () => ({
  getEnv: jest.fn(() => ({ NEXT_PUBLIC_API_BASE_URL: `https://api.example.com` })),
}));

jest.mock(`./request-origin`, () => ({
  getRequestOrigin: jest.fn(() => `https://admin.example.com`),
}));

const { cookies: mockedCookies } = jest.requireMock(`next/headers`) as {
  cookies: jest.Mock<() => Promise<{ toString: () => string }>>;
};

const mockFetch = jest.fn<typeof fetch>();

global.fetch = mockFetch;

describe(`admin api query serialization`, () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockedCookies.mockResolvedValue({ toString: () => `admin_access_token=token` });
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ items: [], pageInfo: { nextCursor: null }, total: 0, page: 1, pageSize: 20 }), {
        status: 200,
        headers: { 'Content-Type': `application/json` },
      }),
    );
  });

  it(`omits empty, invalid, and false true-only payment filters before dispatch`, async () => {
    const { getPayments } = await import(`./admin-api.server`);

    await getPayments({
      q: `  invoice  `,
      status: `   `,
      amountMin: Number.NaN,
      amountMax: 100,
      overdue: false,
    });

    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(
      `https://api.example.com/admin-v2/payments?limit=25&q=invoice&amountMax=100`,
    );
  });

  it(`preserves explicit false boolean filters for payment methods`, async () => {
    const { getPaymentMethods } = await import(`./admin-api.server`);

    await getPaymentMethods({ defaultSelected: false });

    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(
      `https://api.example.com/admin-v2/payment-methods?page=1&pageSize=20&defaultSelected=false`,
    );
  });

  it(`omits false true-only boolean filters`, async () => {
    const { getVerificationQueue } = await import(`./admin-api.server`);

    await getVerificationQueue({ missingProfileData: false, missingDocuments: false });

    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(
      `https://api.example.com/admin-v2/verification/queue?page=1&pageSize=20`,
    );
  });

  it(`omits false include-deleted filters for payment methods`, async () => {
    const { getPaymentMethods } = await import(`./admin-api.server`);

    await getPaymentMethods({ includeDeleted: false });

    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(
      `https://api.example.com/admin-v2/payment-methods?page=1&pageSize=20`,
    );
  });

  it(`serializes ledger client fields and omits invalid dates`, async () => {
    const { getLedgerEntries } = await import(`./admin-api.server`);

    await getLedgerEntries({
      paymentRequestId: `  payment-1  `,
      consumerId: `consumer-1`,
      q: `  dispute  `,
      dateFrom: `not-a-date`,
    });

    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(
      `https://api.example.com/admin-v2/ledger?limit=25&q=dispute&paymentRequestId=payment-1&consumerId=consumer-1`,
    );
  });
});
