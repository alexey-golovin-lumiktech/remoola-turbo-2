import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

describe(`payments requests ancillary routing`, () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_API_BASE_URL = `https://api.example.com`;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    delete process.env.CONSUMER_CSS_GRID_APP_ORIGIN;
    delete process.env.NEXT_PUBLIC_APP_ORIGIN;
    jest.clearAllMocks();
  });

  async function loadSubject() {
    const revalidatePath = jest.fn();
    jest.doMock(`next/cache`, () => ({
      revalidatePath,
    }));
    jest.doMock(`next/headers`, () => ({
      cookies: jest.fn(async () => ({
        toString: (): string => `consumer_session=test-cookie`,
      })),
    }));

    const subject = await import(`./payments-requests.server`);
    return { ...subject, revalidatePath };
  }

  it(`adds explicit css-grid appScope when starting a payment`, async () => {
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ paymentRequestId: `payment-request-1`, ledgerId: `ledger-1` }), { status: 200 }),
    );
    global.fetch = fetchMock;

    const { startPaymentMutation } = await loadSubject();
    const result = await startPaymentMutation({
      email: `payer@example.com`,
      amount: `10`,
      currencyCode: `USD`,
      method: `CREDIT_CARD`,
    });

    expect(result).toEqual({
      ok: true,
      paymentRequestId: `payment-request-1`,
      ledgerId: `ledger-1`,
      message: `Payment created`,
    });
    const [url, init] = fetchMock.mock.calls[0] as [URL | string, RequestInit | undefined];
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(String(url)).toBe(`https://api.example.com/consumer/payments/start?appScope=consumer-css-grid`);
    expect(headers.Cookie).toBe(`consumer_session=test-cookie`);
    expect(headers.origin).toBe(`http://localhost:3003`);
  });

  it(`adds explicit css-grid appScope when sending a payment request`, async () => {
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    global.fetch = fetchMock;

    const { sendPaymentRequestMutation } = await loadSubject();
    const result = await sendPaymentRequestMutation(`payment-request-3`);

    expect(result).toEqual({ ok: true, message: `Payment request sent` });
    const [url, init] = fetchMock.mock.calls[0] as [URL | string, RequestInit | undefined];
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(String(url)).toBe(
      `https://api.example.com/consumer/payment-requests/payment-request-3/send?appScope=consumer-css-grid`,
    );
    expect(headers.Cookie).toBe(`consumer_session=test-cookie`);
    expect(headers.origin).toBe(`http://localhost:3003`);
  });

  it(`revalidates contract pages when sending a payment request from contract detail`, async () => {
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    global.fetch = fetchMock;

    const { sendPaymentRequestMutation, revalidatePath } = await loadSubject();
    const result = await sendPaymentRequestMutation(`payment-request-4`, {
      contractId: `contract-1`,
      returnTo: `/contracts/contract-1`,
    });

    expect(result).toEqual({ ok: true, message: `Payment request sent` });
    expect(revalidatePath).toHaveBeenCalledWith(`/payments`);
    expect(revalidatePath).toHaveBeenCalledWith(`/payments/payment-request-4`);
    expect(revalidatePath).toHaveBeenCalledWith(`/dashboard`);
    expect(revalidatePath).toHaveBeenCalledWith(`/contracts`);
    expect(revalidatePath).toHaveBeenCalledWith(`/contracts/contract-1`);
  });
});

describe(`createPaymentRequestMutation`, () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_API_BASE_URL = `https://api.example.com`;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    jest.clearAllMocks();
  });

  async function loadSubject() {
    jest.doMock(`next/cache`, () => ({
      revalidatePath: jest.fn(),
    }));
    jest.doMock(`next/headers`, () => ({
      cookies: jest.fn(async () => ({
        toString: (): string => `consumer_session=test-cookie`,
      })),
    }));

    return await import(`./payments-requests.server`);
  }

  it(`rejects scientific-notation amounts before calling the backend`, async () => {
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;
    const { createPaymentRequestMutation } = await loadSubject();

    const result = await createPaymentRequestMutation({
      email: `known@example.com`,
      amount: `1e3`,
      currencyCode: `USD`,
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Please enter a valid amount`,
        fields: { amount: `Amount must be greater than zero` },
      },
    });
  });
});

describe(`attachDocumentToDraftPaymentRequestsMutation`, () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_API_BASE_URL = `https://api.example.com`;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    jest.clearAllMocks();
  });

  async function loadSubject() {
    const revalidatePath = jest.fn();
    jest.doMock(`next/cache`, () => ({
      revalidatePath,
    }));
    jest.doMock(`next/headers`, () => ({
      cookies: jest.fn(async () => ({
        toString: (): string => `consumer_session=test-cookie`,
      })),
    }));

    const subject = await import(`./payments-requests.server`);
    return { ...subject, revalidatePath };
  }

  it(`attaches one document across multiple draft payments`, async () => {
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    global.fetch = fetchMock;

    const { attachDocumentToDraftPaymentRequestsMutation, revalidatePath } = await loadSubject();
    const result = await attachDocumentToDraftPaymentRequestsMutation([`payment-1`, `payment-2`], `resource-1`);

    expect(result).toEqual({
      ok: true,
      attachedCount: 2,
      message: `Document attached to 2 draft payment requests.`,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(revalidatePath).toHaveBeenCalledWith(`/payments/payment-1`);
    expect(revalidatePath).toHaveBeenCalledWith(`/payments/payment-2`);
  });

  it(`surfaces partial success when one attach fails after earlier successes`, async () => {
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: `API_ERROR`, message: `Draft became unavailable` }), { status: 409 }),
      );
    global.fetch = fetchMock;

    const { attachDocumentToDraftPaymentRequestsMutation } = await loadSubject();
    const result = await attachDocumentToDraftPaymentRequestsMutation([`payment-1`, `payment-2`], `resource-1`);

    expect(result).toEqual({
      ok: false,
      attachedCount: 1,
      error: {
        code: `API_ERROR`,
        message: `Document attached to 1 draft payment request before the operation stopped. Draft became unavailable`,
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
