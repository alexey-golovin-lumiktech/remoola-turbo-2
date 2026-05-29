import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

describe(`payments stripe ancillary routing`, () => {
  const envRef = process.env as Record<string, string | undefined>;
  const originalFetch = global.fetch;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCssGridOrigin = process.env.CONSUMER_CSS_GRID_APP_ORIGIN;
  const originalNextPublicAppOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN;

  beforeEach(() => {
    jest.resetModules();
    envRef.NEXT_PUBLIC_API_BASE_URL = `https://api.example.com`;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    envRef.NODE_ENV = originalNodeEnv;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    if (originalCssGridOrigin === undefined) {
      delete process.env.CONSUMER_CSS_GRID_APP_ORIGIN;
    } else {
      process.env.CONSUMER_CSS_GRID_APP_ORIGIN = originalCssGridOrigin;
    }
    if (originalNextPublicAppOrigin === undefined) {
      delete process.env.NEXT_PUBLIC_APP_ORIGIN;
    } else {
      process.env.NEXT_PUBLIC_APP_ORIGIN = originalNextPublicAppOrigin;
    }
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

    const subject = await import(`./payments-stripe.server`);
    return { ...subject, revalidatePath };
  }

  it(`adds explicit css-grid appScope when creating a checkout session`, async () => {
    process.env.CONSUMER_CSS_GRID_APP_ORIGIN = `https://grid.example.com/path-ignored`;
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ url: `https://checkout.example/session` }), { status: 200 }),
    );
    global.fetch = fetchMock;

    const { createPaymentCheckoutSessionMutation } = await loadSubject();
    const result = await createPaymentCheckoutSessionMutation(`payment-request-1`);

    expect(result).toEqual({
      ok: true,
      data: { url: `https://checkout.example/session` },
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const [url] = fetchMock.mock.calls[0] as [URL | string, RequestInit | undefined];
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(String(url)).toBe(
      `https://api.example.com/consumer/stripe/payment-request-1/stripe-session?appScope=consumer-css-grid`,
    );
    expect(headers.Cookie).toBe(`consumer_session=test-cookie`);
    expect(headers.origin).toBe(`https://grid.example.com`);
  });

  it(`preserves contract context when creating a checkout session`, async () => {
    process.env.CONSUMER_CSS_GRID_APP_ORIGIN = `https://grid.example.com/path-ignored`;
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ url: `https://checkout.example/session` }), { status: 200 }),
    );
    global.fetch = fetchMock;

    const { createPaymentCheckoutSessionMutation } = await loadSubject();
    await createPaymentCheckoutSessionMutation(`payment-request-1`, {
      contractId: `contract-1`,
      returnTo: `/contracts/contract-1`,
    });

    const [url] = fetchMock.mock.calls[0] as [URL | string, RequestInit | undefined];
    expect(String(url)).toBe(
      `https://api.example.com/consumer/stripe/payment-request-1/stripe-session?appScope=consumer-css-grid&contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1`,
    );
  });

  it(`prefers an explicit canonical css-grid app origin over NEXT_PUBLIC_APP_ORIGIN`, async () => {
    process.env.CONSUMER_CSS_GRID_APP_ORIGIN = `https://grid.example.com/path-ignored`;
    process.env.NEXT_PUBLIC_APP_ORIGIN = `https://public-grid.example.com/path-ignored`;
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ url: `https://checkout.example/session` }), { status: 200 }),
    );
    global.fetch = fetchMock;

    const { createPaymentCheckoutSessionMutation } = await loadSubject();
    await createPaymentCheckoutSessionMutation(`payment-request-1`);

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.origin).toBe(`https://grid.example.com`);
  });

  it(`fails fast in production when no canonical css-grid origin is configured`, async () => {
    envRef.NODE_ENV = `production`;
    delete process.env.CONSUMER_CSS_GRID_APP_ORIGIN;
    delete process.env.NEXT_PUBLIC_APP_ORIGIN;
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;

    const { createPaymentCheckoutSessionMutation } = await loadSubject();

    await expect(createPaymentCheckoutSessionMutation(`payment-request-1`)).rejects.toThrow(
      `Consumer css-grid app origin is not configured`,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it(`keeps trust-layer origin forwarding for saved-method payments outside Vercel and still sends an idempotency key`, async () => {
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true, paymentIntentId: `pi_123`, status: `succeeded` }), { status: 200 }),
    );
    global.fetch = fetchMock;

    const { payWithSavedMethodMutation } = await loadSubject();
    const result = await payWithSavedMethodMutation(`payment-request-2`, `pm_saved_1`);

    expect(result).toEqual({
      ok: true,
      data: {
        success: true,
        paymentIntentId: `pi_123`,
        status: `succeeded`,
        nextAction: undefined,
      },
    });

    const [url, init] = fetchMock.mock.calls[0] as [URL | string, RequestInit | undefined];
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const idempotencyKey = headers[`idempotency-key`];
    expect(String(url)).toBe(
      `https://api.example.com/consumer/stripe/payment-request-2/pay-with-saved-method?appScope=consumer-css-grid`,
    );
    expect(headers.Cookie).toBe(`consumer_session=test-cookie`);
    expect(headers.origin).toBe(`http://localhost:3003`);
    expect(typeof idempotencyKey).toBe(`string`);
    expect((idempotencyKey ?? ``).length).toBeGreaterThan(0);
  });

  it(`encodes payment request ids before starting checkout`, async () => {
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ url: `https://checkout.example/session` }), { status: 200 }),
    );
    global.fetch = fetchMock;

    const { createPaymentCheckoutSessionMutation } = await loadSubject();
    await createPaymentCheckoutSessionMutation(`payment/abc?x=1`);

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      `https://api.example.com/consumer/stripe/payment%2Fabc%3Fx%3D1/stripe-session?appScope=consumer-css-grid`,
    );
  });
});

describe(`generateInvoiceMutation`, () => {
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

    const subject = await import(`./payments-stripe.server`);
    return { ...subject, revalidatePath };
  }

  it(`rewrites generated invoice downloads to the app proxy route`, async () => {
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          invoiceNumber: `INV-1001`,
          resourceId: `resource-9`,
          downloadUrl: `https://api.example.com/api/consumer/documents/resource-9/download`,
        }),
        { status: 200 },
      ),
    );
    global.fetch = fetchMock;

    const { generateInvoiceMutation, revalidatePath } = await loadSubject();
    const result = await generateInvoiceMutation(`payment-request-1`, {
      contractId: `contract-1`,
      returnTo: `/contracts/contract-1`,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        invoiceNumber: `INV-1001`,
        resourceId: `resource-9`,
        downloadUrl: `/api/documents/resource-9/download`,
      },
      message: `Invoice INV-1001 is ready`,
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/payments/payment-request-1`);
    expect(revalidatePath).toHaveBeenCalledWith(`/contracts`);
    expect(revalidatePath).toHaveBeenCalledWith(`/contracts/contract-1`);
  });
});
