import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

describe(`refreshExchangeRatesMutation`, () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  async function loadSubject() {
    const getExchangeRatesBatch = jest.fn<
      (pairs: Array<{ from: string; to: string }>) => Promise<{
        items: Array<{ from: string; to: string; rate: number | null; status: `available` | `stale` | `unavailable` }>;
        unavailable: boolean;
      }>
    >();

    jest.doMock(`next/cache`, () => ({
      revalidatePath: jest.fn(),
    }));
    jest.doMock(`next/headers`, () => ({
      cookies: jest.fn(async () => ({
        toString: (): string => `consumer_session=test-cookie`,
      })),
    }));
    jest.doMock(`./consumer-api.server`, () => ({
      getExchangeRatesBatch,
    }));

    const subject = await import(`./consumer-mutations.server`);
    return {
      ...subject,
      getExchangeRatesBatch,
    };
  }

  it(`normalizes, filters, and deduplicates pairs before refreshing rates`, async () => {
    const { refreshExchangeRatesMutation, getExchangeRatesBatch } = await loadSubject();
    getExchangeRatesBatch.mockResolvedValueOnce({
      items: [
        { from: `USD`, to: `EUR`, rate: 0.95, status: `available` },
        { from: `USD`, to: `GBP`, rate: null, status: `stale` },
      ],
      unavailable: false,
    });

    const result = await refreshExchangeRatesMutation({
      pairs: [
        { from: ` usd `, to: ` eur ` },
        { from: `USD`, to: `EUR` },
        { from: `usd`, to: `usd` },
        { from: `usd`, to: `gbp` },
      ],
    });

    expect(getExchangeRatesBatch).toHaveBeenCalledWith([
      { from: `USD`, to: `EUR` },
      { from: `USD`, to: `GBP` },
    ]);
    expect(result).toEqual({
      ok: true,
      data: {
        items: [
          { from: `USD`, to: `EUR`, rate: 0.95, status: `available` },
          { from: `USD`, to: `GBP`, rate: null, status: `stale` },
        ],
        unavailable: false,
      },
    });
  });

  it(`returns a validation error when no refreshable pairs remain`, async () => {
    const { refreshExchangeRatesMutation, getExchangeRatesBatch } = await loadSubject();

    const result = await refreshExchangeRatesMutation({
      pairs: [
        { from: `USD`, to: `USD` },
        { from: ` `, to: `EUR` },
      ],
    });

    expect(getExchangeRatesBatch).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `No exchange pairs are available to refresh`,
      },
    });
  });
});

describe(`hasSavedContactByEmailQuery`, () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  async function loadSubject() {
    const findContactByExactEmail =
      jest.fn<(email: string) => Promise<{ id: string; email?: string | null; name?: string | null } | null>>();

    jest.doMock(`next/cache`, () => ({
      revalidatePath: jest.fn(),
    }));
    jest.doMock(`next/headers`, () => ({
      cookies: jest.fn(async () => ({
        toString: (): string => `consumer_session=test-cookie`,
      })),
    }));
    jest.doMock(`./consumer-api.server`, () => ({
      getExchangeRatesBatch: jest.fn(),
      findContactByExactEmail,
    }));

    const subject = await import(`./consumer-mutations.server`);
    return {
      ...subject,
      findContactByExactEmail,
    };
  }

  it(`checks saved-contact existence through the backend exact-email lookup endpoint`, async () => {
    const { hasSavedContactByEmailQuery, findContactByExactEmail } = await loadSubject();
    findContactByExactEmail.mockResolvedValueOnce({ id: `contact-1`, email: `known@example.com` });

    const result = await hasSavedContactByEmailQuery(`Known@example.com`);

    expect(findContactByExactEmail).toHaveBeenCalledWith(`known@example.com`);
    expect(result).toEqual({ ok: true, found: true });
  });

  it(`returns false when the backend exact lookup finds nothing`, async () => {
    const { hasSavedContactByEmailQuery, findContactByExactEmail } = await loadSubject();
    findContactByExactEmail.mockResolvedValueOnce(null);

    const result = await hasSavedContactByEmailQuery(`missing@example.com`);

    expect(result).toEqual({ ok: true, found: false });
  });
});

describe(`consumer Stripe mutation origin forwarding`, () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_API_BASE_URL = `https://api.example.com`;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    delete process.env.VERCEL_URL;
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
    jest.doMock(`./consumer-api.server`, () => ({
      getExchangeRatesBatch: jest.fn(),
      findContactByExactEmail: jest.fn(),
    }));

    const subject = await import(`./consumer-mutations.server`);
    return subject;
  }

  it(`uses the Vercel preview host as origin for checkout session creation`, async () => {
    process.env.VERCEL_URL = `preview.example.vercel.app`;
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
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.Cookie).toBe(`consumer_session=test-cookie`);
    expect(headers.origin).toBe(`https://preview.example.vercel.app`);
  });

  it(`falls back to localhost origin for saved-method payments outside Vercel and still sends an idempotency key`, async () => {
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

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const idempotencyKey = headers[`idempotency-key`];
    expect(headers.Cookie).toBe(`consumer_session=test-cookie`);
    expect(headers.origin).toBe(`http://localhost:3003`);
    expect(typeof idempotencyKey).toBe(`string`);
    expect((idempotencyKey ?? ``).length).toBeGreaterThan(0);
  });
});

describe(`consumer money amount parsing`, () => {
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
    jest.doMock(`./consumer-api.server`, () => ({
      getExchangeRatesBatch: jest.fn(),
      findContactByExactEmail: jest.fn(),
    }));

    return await import(`./consumer-mutations.server`);
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

  it(`rejects comma-formatted amounts before calling the backend`, async () => {
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;
    const { convertExchangeMutation } = await loadSubject();

    const result = await convertExchangeMutation({
      from: `USD`,
      to: `EUR`,
      amount: `1,234.56`,
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Enter a valid amount`,
        fields: { amount: `Amount must be greater than zero` },
      },
    });
  });

  it(`rejects ambiguous exchange-rule money formats before calling the backend`, async () => {
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;
    const { createExchangeRuleMutation } = await loadSubject();

    const result = await createExchangeRuleMutation({
      from: `USD`,
      to: `EUR`,
      targetBalance: `1e3`,
      maxConvertAmount: `1,250.00`,
      minIntervalMinutes: `60`,
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Target balance must be zero or greater`,
        fields: { targetBalance: `Enter a valid target balance` },
      },
    });
  });
});

describe(`consumer money unit contract`, () => {
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
    jest.doMock(`./consumer-api.server`, () => ({
      getExchangeRatesBatch: jest.fn(),
      findContactByExactEmail: jest.fn(),
    }));

    return await import(`./consumer-mutations.server`);
  }

  it(`sends exchange conversion amounts to the backend in major units without extra cent conversion`, async () => {
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    global.fetch = fetchMock;

    const { convertExchangeMutation } = await loadSubject();
    const result = await convertExchangeMutation({
      from: `USD`,
      to: `EUR`,
      amount: `12.34`,
    });

    expect(result).toEqual({ ok: true, message: `Exchange completed` });
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.body).toBe(JSON.stringify({ from: `USD`, to: `EUR`, amount: 12.34 }));
  });

  it(`sends auto-conversion rule thresholds to the backend in major units`, async () => {
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: `rule-1` }), { status: 200 }));
    global.fetch = fetchMock;

    const { createExchangeRuleMutation } = await loadSubject();
    const result = await createExchangeRuleMutation({
      from: `USD`,
      to: `EUR`,
      targetBalance: `25.5`,
      maxConvertAmount: `40.75`,
      minIntervalMinutes: `60`,
      enabled: true,
    });

    expect(result).toEqual({ ok: true, message: `Exchange rule created` });
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.body).toBe(
      JSON.stringify({
        from: `USD`,
        to: `EUR`,
        targetBalance: 25.5,
        maxConvertAmount: 40.75,
        minIntervalMinutes: 60,
        enabled: true,
      }),
    );
  });
});
