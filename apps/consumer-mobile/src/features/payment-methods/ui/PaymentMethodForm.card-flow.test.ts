import { runMobileCardSubmitFlow } from './PaymentMethodForm';

type MockFetchResponse = {
  ok: boolean;
  json: jest.Mock<Promise<unknown>, []>;
};

const cardElement = { id: `card-element` };

function makeDeps() {
  const stripe = {
    createPaymentMethod: jest.fn().mockResolvedValue({
      error: null,
      paymentMethod: {
        id: `pm_123`,
        card: { brand: `visa`, last4: `4242` },
      },
    }),
    confirmCardSetup: jest.fn().mockResolvedValue({
      error: null,
      setupIntent: { id: `seti_123` },
    }),
  };
  const elements = {
    getElement: jest.fn().mockReturnValue(cardElement),
  };
  const onError = jest.fn();
  const onLogInfo = jest.fn();
  const onLogError = jest.fn();

  return {
    fetchFn: jest.fn(),
    stripe,
    elements,
    billingName: `John Doe`,
    billingEmail: `john@example.com`,
    billingPhone: `+15555555555`,
    onError,
    onLogInfo,
    onLogError,
  };
}

describe(`runMobileCardSubmitFlow`, () => {
  it(`handles setup-intent failure`, async () => {
    const deps = makeDeps();
    deps.fetchFn.mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValue({}),
    } satisfies MockFetchResponse);

    const ok = await runMobileCardSubmitFlow(deps);

    expect(ok).toBe(false);
    expect(deps.onError).toHaveBeenCalledWith(expect.any(String));
  });

  it(`handles createPaymentMethod failure`, async () => {
    const deps = makeDeps();
    deps.fetchFn.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ clientSecret: `cs_123` }),
    } satisfies MockFetchResponse);
    deps.stripe.createPaymentMethod.mockResolvedValueOnce({
      error: { type: `card_error`, message: `Card declined` },
      paymentMethod: null,
    });

    const ok = await runMobileCardSubmitFlow(deps);

    expect(ok).toBe(false);
    expect(deps.onError).toHaveBeenCalledWith(`Card declined`);
  });

  it(`handles confirmCardSetup failure`, async () => {
    const deps = makeDeps();
    deps.fetchFn.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ clientSecret: `cs_123` }),
    } satisfies MockFetchResponse);
    deps.stripe.confirmCardSetup.mockResolvedValueOnce({
      error: { type: `card_error`, message: `Setup failed` },
      setupIntent: null,
    });

    const ok = await runMobileCardSubmitFlow(deps);

    expect(ok).toBe(false);
    expect(deps.onError).toHaveBeenCalledWith(`Setup failed`);
  });

  it(`passes through backend /confirm failure with code`, async () => {
    const deps = makeDeps();
    deps.fetchFn
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ clientSecret: `cs_123` }),
      } satisfies MockFetchResponse)
      .mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({ code: `PAYMENT_METHOD_DUPLICATE`, message: `Add failed` }),
      } satisfies MockFetchResponse);

    const ok = await runMobileCardSubmitFlow(deps);

    expect(ok).toBe(false);
    expect(deps.onError).toHaveBeenCalledWith(expect.any(String), `PAYMENT_METHOD_DUPLICATE`);
  });

  it(`runs happy path`, async () => {
    const deps = makeDeps();
    deps.fetchFn
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ clientSecret: `cs_123` }),
      } satisfies MockFetchResponse)
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      } satisfies MockFetchResponse);

    const ok = await runMobileCardSubmitFlow(deps);

    expect(ok).toBe(true);
    expect(deps.onError).not.toHaveBeenCalled();
    expect(deps.onLogInfo).toHaveBeenCalledWith(`Confirming setup intent`, { brand: `visa`, last4: `4242` });
  });
});
