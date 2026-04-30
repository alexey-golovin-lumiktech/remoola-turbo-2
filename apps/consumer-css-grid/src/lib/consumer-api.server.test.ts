import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
type MockFetch = jest.MockedFunction<typeof fetch>;

describe(`consumer-api exchange batch parsing`, () => {
  const originalFetch = global.fetch;
  let mockFetch: MockFetch;

  beforeEach(() => {
    mockFetch = jest.fn() as MockFetch;
    global.fetch = mockFetch;
    jest.resetModules();
    process.env.NEXT_PUBLIC_API_BASE_URL = `https://api.example.com`;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    jest.clearAllMocks();
  });

  async function loadSubject() {
    const mockCookies = jest.fn(async () => ({
      toString: (): string => `consumer_session=test-cookie`,
    }));

    jest.doMock(`next/headers`, () => ({
      cookies: mockCookies,
    }));

    return import(`./consumer-api.server`);
  }

  it(`keeps successful rows and drops partial-success error rows from the batch response`, async () => {
    const { getExchangeRatesBatch } = await loadSubject();
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET = `bypass-secret`;
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            { from: `USD`, to: `EUR`, rate: 0.95 },
            { from: `EUR`, to: `USD`, rate: 1.0576 },
            { from: `USD`, to: `GBP`, code: `RATE_STALE` },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await getExchangeRatesBatch([
      { from: `USD`, to: `EUR` },
      { from: `EUR`, to: `USD` },
      { from: `USD`, to: `GBP` },
    ]);

    expect(result).toEqual({
      items: [
        { from: `USD`, to: `EUR`, rate: 0.95, status: `available` },
        { from: `EUR`, to: `USD`, rate: 1.0576, status: `available` },
        { from: `USD`, to: `GBP`, rate: null, status: `stale` },
      ],
      unavailable: false,
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`https://api.example.com/consumer/exchange/rates/batch`);
    expect(mockFetch.mock.calls[0]?.[1]).toMatchObject({
      method: `POST`,
      headers: expect.objectContaining({
        Cookie: `consumer_session=test-cookie`,
        'content-type': `application/json`,
        'x-vercel-protection-bypass': `bypass-secret`,
      }),
    });
    delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  });

  it(`returns an empty array without retrying singles when the batch response contains only error rows`, async () => {
    const { getExchangeRatesBatch } = await loadSubject();
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            { from: `USD`, to: `EUR`, code: `RATE_NOT_AVAILABLE` },
            { from: `EUR`, to: `USD`, code: `RATE_STALE` },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await getExchangeRatesBatch([
      { from: `USD`, to: `EUR` },
      { from: `EUR`, to: `USD` },
    ]);

    expect(result).toEqual({
      items: [
        { from: `USD`, to: `EUR`, rate: null, status: `unavailable` },
        { from: `EUR`, to: `USD`, rate: null, status: `stale` },
      ],
      unavailable: false,
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it(`marks the whole batch unavailable without retrying singles when the request fails at the transport level`, async () => {
    const { getExchangeRatesBatch } = await loadSubject();
    mockFetch.mockResolvedValueOnce(new Response(`batch failed`, { status: 500 }));

    const result = await getExchangeRatesBatch([
      { from: `USD`, to: `EUR` },
      { from: `EUR`, to: `USD` },
    ]);

    expect(result).toEqual({
      items: [],
      unavailable: true,
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it(`keeps requested pairs stable when the batch response omits one row`, async () => {
    const { getExchangeRatesBatch } = await loadSubject();
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ from: `USD`, to: `EUR`, rate: 0.95 }],
        }),
        { status: 200 },
      ),
    );

    const result = await getExchangeRatesBatch([
      { from: `USD`, to: `EUR` },
      { from: `EUR`, to: `USD` },
    ]);

    expect(result).toEqual({
      items: [
        { from: `USD`, to: `EUR`, rate: 0.95, status: `available` },
        { from: `EUR`, to: `USD`, rate: null, status: `unavailable` },
      ],
      unavailable: false,
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe(`consumer-api exact contact lookup`, () => {
  const originalFetch = global.fetch;
  let mockFetch: MockFetch;

  beforeEach(() => {
    mockFetch = jest.fn() as MockFetch;
    global.fetch = mockFetch;
    jest.resetModules();
    process.env.NEXT_PUBLIC_API_BASE_URL = `https://api.example.com`;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    jest.clearAllMocks();
  });

  async function loadSubject() {
    const mockCookies = jest.fn(async () => ({
      toString: (): string => `consumer_session=test-cookie`,
    }));

    jest.doMock(`next/headers`, () => ({
      cookies: mockCookies,
    }));

    return import(`./consumer-api.server`);
  }

  it(`uses the dedicated exact-email lookup route`, async () => {
    const { findContactByExactEmail } = await loadSubject();
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: `contact-1`, email: `known@example.com`, name: `Known Contact` }), {
        status: 200,
      }),
    );

    const result = await findContactByExactEmail(` Known@Example.com `);

    expect(result).toEqual({
      id: `contact-1`,
      email: `known@example.com`,
      name: `Known Contact`,
    });
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(
      `https://api.example.com/consumer/contacts/lookup/by-email?email=known%40example.com`,
    );
  });
});

describe(`consumer-api balance normalization`, () => {
  const originalFetch = global.fetch;
  let mockFetch: MockFetch;

  beforeEach(() => {
    mockFetch = jest.fn() as MockFetch;
    global.fetch = mockFetch;
    jest.resetModules();
    process.env.NEXT_PUBLIC_API_BASE_URL = `https://api.example.com`;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    jest.clearAllMocks();
  });

  async function loadSubject() {
    const mockCookies = jest.fn(async () => ({
      toString: (): string => `consumer_session=test-cookie`,
    }));

    jest.doMock(`next/headers`, () => ({
      cookies: mockCookies,
    }));

    return import(`./consumer-api.server`);
  }

  it(`converts major-unit balances to minor units for the UI`, async () => {
    const { getBalances } = await loadSubject();
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          USD: 12.34,
          EUR: 0.01,
        }),
        { status: 200 },
      ),
    );

    const result = await getBalances();

    expect(result).toEqual({
      USD: 1234,
      EUR: 1,
    });
  });

  it(`converts available balances from major units to minor units for the UI`, async () => {
    const { getAvailableBalances } = await loadSubject();
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          USD: 16.77,
          GBP: 2,
        }),
        { status: 200 },
      ),
    );

    const result = await getAvailableBalances();

    expect(result).toEqual({
      USD: 1677,
      GBP: 200,
    });
  });
});

describe(`consumer-api SSR unauthorized redirects`, () => {
  const originalFetch = global.fetch;
  let mockFetch: MockFetch;

  beforeEach(() => {
    mockFetch = jest.fn() as MockFetch;
    global.fetch = mockFetch;
    jest.resetModules();
    process.env.NEXT_PUBLIC_API_BASE_URL = `https://api.example.com`;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    jest.clearAllMocks();
  });

  async function loadSubject() {
    const redirect = jest.fn((url: string) => {
      const error = new Error(`NEXT_REDIRECT:${url}`) as Error & { digest?: string };
      error.digest = `NEXT_REDIRECT;${url}`;
      throw error;
    });
    const mockCookies = jest.fn(async () => ({
      toString: (): string => `consumer_session=test-cookie`,
    }));

    jest.doMock(`next/headers`, () => ({
      cookies: mockCookies,
    }));
    jest.doMock(`next/navigation`, () => ({
      redirect,
    }));

    const subject = await import(`./consumer-api.server`);
    return { ...subject, redirect };
  }

  it(`redirects dashboard SSR readers to login when the backend returns 401`, async () => {
    const { getDashboardData, redirect } = await loadSubject();
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 }));

    await expect(getDashboardData({ redirectTo: `/dashboard` })).rejects.toThrow(
      `NEXT_REDIRECT:/login?session_expired=1&next=%2Fdashboard`,
    );
    expect(redirect).toHaveBeenCalledWith(`/login?session_expired=1&next=%2Fdashboard`);
  });

  it(`redirects payment detail SSR readers to login on unauthorized fetches`, async () => {
    const { getPaymentView, redirect } = await loadSubject();
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 }));

    await expect(getPaymentView(`payment-request-1`, { redirectTo: `/payments/payment-request-1` })).rejects.toThrow(
      `NEXT_REDIRECT:/login?session_expired=1&next=%2Fpayments%2Fpayment-request-1`,
    );
    expect(redirect).toHaveBeenCalledWith(`/login?session_expired=1&next=%2Fpayments%2Fpayment-request-1`);
  });

  it(`redirects exchange SSR batch reads to login when a cookie-only session expires`, async () => {
    const { getExchangeRatesBatch, redirect } = await loadSubject();
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 }));

    await expect(getExchangeRatesBatch([{ from: `USD`, to: `EUR` }], { redirectTo: `/exchange` })).rejects.toThrow(
      `NEXT_REDIRECT:/login?session_expired=1&next=%2Fexchange`,
    );
    expect(redirect).toHaveBeenCalledWith(`/login?session_expired=1&next=%2Fexchange`);
  });
});

describe(`consumer-api document download proxy normalization`, () => {
  const originalFetch = global.fetch;
  let mockFetch: MockFetch;

  beforeEach(() => {
    mockFetch = jest.fn() as MockFetch;
    global.fetch = mockFetch;
    jest.resetModules();
    process.env.NEXT_PUBLIC_API_BASE_URL = `https://api.example.com`;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    jest.clearAllMocks();
  });

  async function loadSubject() {
    const mockCookies = jest.fn(async () => ({
      toString: (): string => `consumer_session=test-cookie`,
    }));

    jest.doMock(`next/headers`, () => ({
      cookies: mockCookies,
    }));

    return import(`./consumer-api.server`);
  }

  it(`rewrites document library download links to the app proxy route`, async () => {
    const { getDocuments } = await loadSubject();
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            {
              id: `resource-1`,
              name: `contract.pdf`,
              size: 1024,
              createdAt: `2026-01-01T00:00:00.000Z`,
              downloadUrl: `https://api.example.com/api/consumer/documents/resource-1/download`,
              mimetype: `application/pdf`,
              kind: `CONTRACT`,
              tags: [],
              isAttachedToDraftPaymentRequest: false,
              attachedDraftPaymentRequestIds: [],
              isAttachedToNonDraftPaymentRequest: false,
              attachedNonDraftPaymentRequestIds: [],
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
        }),
        { status: 200 },
      ),
    );

    const result = await getDocuments(1, 20);

    expect(result?.items[0]?.downloadUrl).toBe(`/api/documents/resource-1/download`);
  });

  it(`passes contact filters to the documents endpoint`, async () => {
    const { getDocuments } = await loadSubject();
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET = `bypass-secret`;
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [],
          total: 0,
          page: 1,
          pageSize: 20,
        }),
        { status: 200 },
      ),
    );

    await getDocuments(1, 20, undefined, { contactId: `contact-1` });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`/consumer/documents?page=1&pageSize=20&contactId=contact-1`),
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: `consumer_session=test-cookie`,
          'x-vercel-protection-bypass': `bypass-secret`,
        }),
      }),
    );
    delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  });

  it(`rewrites payment attachment download links to the app proxy route`, async () => {
    const { getPaymentView } = await loadSubject();
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: `payment-1`,
          amount: 10,
          currencyCode: `USD`,
          status: `DRAFT`,
          createdAt: `2026-01-01T00:00:00.000Z`,
          updatedAt: `2026-01-01T00:00:00.000Z`,
          role: `REQUESTER`,
          payer: null,
          requester: null,
          ledgerEntries: [],
          attachments: [
            {
              id: `resource-2`,
              name: `invoice.pdf`,
              downloadUrl: `https://api.example.com/api/consumer/documents/resource-2/download`,
              size: 2048,
              createdAt: `2026-01-01T00:00:00.000Z`,
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await getPaymentView(`payment-1`);

    expect(result?.attachments[0]?.downloadUrl).toBe(`/api/documents/resource-2/download`);
  });

  it(`rewrites contact detail document links to the app proxy route`, async () => {
    const { getContactDetails } = await loadSubject();
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: `contact-1`,
          name: `Known Contact`,
          email: `known@example.com`,
          paymentRequests: [],
          documents: [
            {
              id: `resource-3`,
              name: `w9.pdf`,
              url: `https://api.example.com/api/consumer/documents/resource-3/download`,
              createdAt: `2026-01-01T00:00:00.000Z`,
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await getContactDetails(`contact-1`);

    expect(result?.documents[0]?.url).toBe(`/api/documents/resource-3/download`);
  });

  it(`rewrites contract detail document links to the app proxy route`, async () => {
    const { getContractDetails } = await loadSubject();
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: `contact-1`,
          name: `Known Contact`,
          email: `known@example.com`,
          updatedAt: `2026-01-02T00:00:00.000Z`,
          address: null,
          summary: {
            lastStatus: `completed`,
            lastActivity: `2026-01-02T00:00:00.000Z`,
            lastRequestId: `payment-1`,
            documentsCount: 1,
            paymentsCount: 1,
            completedPaymentsCount: 1,
          },
          payments: [
            {
              id: `payment-1`,
              amount: `100`,
              status: `completed`,
              createdAt: `2026-01-01T00:00:00.000Z`,
              updatedAt: `2026-01-02T00:00:00.000Z`,
            },
          ],
          documents: [
            {
              id: `resource-4`,
              name: `contract.pdf`,
              downloadUrl: `https://api.example.com/api/consumer/documents/resource-4/download`,
              createdAt: `2026-01-01T00:00:00.000Z`,
              tags: [`contract`],
              isAttachedToDraftPaymentRequest: false,
              attachedDraftPaymentRequestIds: [],
              isAttachedToNonDraftPaymentRequest: true,
              attachedNonDraftPaymentRequestIds: [`payment-1`],
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await getContractDetails(`contact-1`);

    expect(result?.documents[0]?.downloadUrl).toBe(`/api/documents/resource-4/download`);
  });
});
