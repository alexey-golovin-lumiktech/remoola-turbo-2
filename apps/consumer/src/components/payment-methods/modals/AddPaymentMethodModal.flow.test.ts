import { runCreateCardMethodFlow } from './AddPaymentMethodModal';

type MockFetchResponse = {
  ok: boolean;
  json: jest.Mock<Promise<unknown>, []>;
};

const cardElement = { id: `card-element` };

function makeBaseDeps() {
  const onCreated = jest.fn();
  const onClose = jest.fn();
  const onError = jest.fn();
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

  return {
    fetchFn: jest.fn(),
    stripe,
    elements,
    billingName: `John Doe`,
    billingEmail: `john@example.com`,
    billingPhone: `+15555555555`,
    onCreated,
    onClose,
    onError,
  };
}

describe(`runCreateCardMethodFlow`, () => {
  it(`handles setup-intent failure`, async () => {
    const deps = makeBaseDeps();
    deps.fetchFn.mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValue({}),
    } satisfies MockFetchResponse);

    const ok = await runCreateCardMethodFlow(deps);

    expect(ok).toBe(false);
    expect(deps.onError).toHaveBeenCalledWith(`Failed to create SetupIntent`);
    expect(deps.onCreated).not.toHaveBeenCalled();
    expect(deps.onClose).not.toHaveBeenCalled();
  });

  it(`handles createPaymentMethod failure`, async () => {
    const deps = makeBaseDeps();
    deps.fetchFn.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ clientSecret: `cs_123` }),
    } satisfies MockFetchResponse);
    deps.stripe.createPaymentMethod.mockResolvedValueOnce({
      error: { message: `Card declined` },
      paymentMethod: null,
    });

    const ok = await runCreateCardMethodFlow(deps);

    expect(ok).toBe(false);
    expect(deps.onError).toHaveBeenCalledWith(`Card declined`);
  });

  it(`handles confirmCardSetup failure`, async () => {
    const deps = makeBaseDeps();
    deps.fetchFn.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ clientSecret: `cs_123` }),
    } satisfies MockFetchResponse);
    deps.stripe.confirmCardSetup.mockResolvedValueOnce({
      error: { message: `Setup failed` },
      setupIntent: null,
    });

    const ok = await runCreateCardMethodFlow(deps);

    expect(ok).toBe(false);
    expect(deps.onError).toHaveBeenCalledWith(`Setup failed`);
  });

  it(`passes through backend /confirm error message`, async () => {
    const deps = makeBaseDeps();
    deps.fetchFn
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ clientSecret: `cs_123` }),
      } satisfies MockFetchResponse)
      .mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({ message: `Payment method already exists` }),
      } satisfies MockFetchResponse);

    const ok = await runCreateCardMethodFlow(deps);

    expect(ok).toBe(false);
    expect(deps.onError).toHaveBeenCalledWith(`Payment method already exists`);
  });

  it(`runs happy path and calls success callbacks`, async () => {
    const deps = makeBaseDeps();
    deps.fetchFn
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ clientSecret: `cs_123` }),
      } satisfies MockFetchResponse)
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      } satisfies MockFetchResponse);

    const ok = await runCreateCardMethodFlow(deps);

    expect(ok).toBe(true);
    expect(deps.onError).not.toHaveBeenCalled();
    expect(deps.onCreated).toHaveBeenCalledTimes(1);
    expect(deps.onClose).toHaveBeenCalledTimes(1);
  });
});
