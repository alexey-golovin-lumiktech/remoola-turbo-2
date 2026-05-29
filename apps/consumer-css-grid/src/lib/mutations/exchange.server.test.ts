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
    jest.doMock(`../consumer-api.server`, () => ({
      getExchangeRatesBatch,
    }));

    const subject = await import(`./exchange.server`);
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

describe(`exchange mutation validation and units`, () => {
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
    jest.doMock(`../consumer-api.server`, () => ({
      getExchangeRatesBatch: jest.fn(),
    }));

    return await import(`./exchange.server`);
  }

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

  it(`encodes scheduled conversion ids before calling the backend`, async () => {
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    global.fetch = fetchMock;

    const { cancelScheduledExchangeMutation } = await loadSubject();
    const result = await cancelScheduledExchangeMutation(`conversion/abc?x=1`);

    expect(result).toEqual({ ok: true, message: `Scheduled conversion cancelled` });
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      `https://api.example.com/consumer/exchange/scheduled/conversion%2Fabc%3Fx%3D1/cancel`,
    );
  });
});
