import { AdminV2PaymentsController } from './admin-v2-payments.controller';

describe(`AdminV2PaymentsController`, () => {
  const actor = { id: `admin-1`, email: `admin@example.com`, type: `ADMIN` } as never;

  it(`createRefund: verifies step-up and delegates`, async () => {
    const assertCapability = jest.fn(async () => ({}));
    const verifyStepUp = jest.fn(async () => undefined);
    const createReversal = jest.fn(async () => ({ ledgerId: `ledger-1`, kind: `REFUND` }));
    const controller = new AdminV2PaymentsController(
      {} as never,
      { assertCapability } as never,
      { verifyStepUp } as never,
      { createReversal } as never,
    );

    const result = await controller.createRefund(actor, `payment-1`, {
      amount: 7,
      reason: `test`,
      passwordConfirmation: `Current1!@#abc`,
    } as never);

    expect(assertCapability).not.toHaveBeenCalled();
    expect(verifyStepUp).toHaveBeenCalledWith(`admin-1`, `Current1!@#abc`);
    expect(createReversal).toHaveBeenCalledWith(`payment-1`, { amount: 7, reason: `test`, kind: `REFUND` }, `admin-1`);
    expect(result).toEqual({ ledgerId: `ledger-1`, kind: `REFUND` });
  });

  it(`createChargeback: verifies step-up and delegates`, async () => {
    const assertCapability = jest.fn(async () => ({}));
    const verifyStepUp = jest.fn(async () => undefined);
    const createReversal = jest.fn(async () => ({ ledgerId: `ledger-2`, kind: `CHARGEBACK` }));
    const controller = new AdminV2PaymentsController(
      {} as never,
      { assertCapability } as never,
      { verifyStepUp } as never,
      { createReversal } as never,
    );

    const result = await controller.createChargeback(actor, `payment-2`, {
      amount: 5,
      reason: `test`,
      passwordConfirmation: `Current1!@#abc`,
    } as never);

    expect(assertCapability).not.toHaveBeenCalled();
    expect(verifyStepUp).toHaveBeenCalledWith(`admin-1`, `Current1!@#abc`);
    expect(createReversal).toHaveBeenCalledWith(
      `payment-2`,
      { amount: 5, reason: `test`, kind: `CHARGEBACK` },
      `admin-1`,
    );
    expect(result).toEqual({ ledgerId: `ledger-2`, kind: `CHARGEBACK` });
  });
});
