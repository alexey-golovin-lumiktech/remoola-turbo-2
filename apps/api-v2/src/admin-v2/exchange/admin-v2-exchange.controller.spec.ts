import { AdminV2ExchangeController } from './admin-v2-exchange.controller';

describe(`AdminV2ExchangeController`, () => {
  const actor = { id: `admin-1`, email: `admin@example.com`, type: `SUPER` } as never;
  const buildReq = () =>
    ({
      ip: `203.0.113.10`,
      headers: { 'user-agent': `jest`, 'idempotency-key': `idem-exchange-1` },
    }) as never;

  function buildHarness() {
    const service = {
      approveRate: jest.fn(async () => ({ ok: true })),
      runRuleNow: jest.fn(async () => ({ ok: true })),
      forceExecuteScheduledConversion: jest.fn(async () => ({ ok: true })),
      cancelScheduledConversion: jest.fn(async () => ({ ok: true })),
    };
    const assertCapability = jest.fn(async () => undefined);
    const verifyStepUp = jest.fn(async () => undefined);
    const controller = new AdminV2ExchangeController(
      service as never,
      { assertCapability } as never,
      { verifyStepUp } as never,
    );

    return { assertCapability, controller, service, verifyStepUp };
  }

  it.each([
    [
      `approveRate`,
      (controller: AdminV2ExchangeController) =>
        controller.approveRate(
          actor,
          `rate-1`,
          { version: 1, confirmed: true, reason: `checked`, passwordConfirmation: `Current1!@#abc` } as never,
          buildReq(),
        ),
      `approveRate`,
    ],
    [
      `runRuleNow`,
      (controller: AdminV2ExchangeController) =>
        controller.runRuleNow(
          actor,
          `rule-1`,
          { version: 1, passwordConfirmation: `Current1!@#abc` } as never,
          buildReq(),
        ),
      `runRuleNow`,
    ],
    [
      `forceExecuteScheduledConversion`,
      (controller: AdminV2ExchangeController) =>
        controller.forceExecuteScheduledConversion(
          actor,
          `conversion-1`,
          { version: 1, confirmed: true, passwordConfirmation: `Current1!@#abc` } as never,
          buildReq(),
        ),
      `forceExecuteScheduledConversion`,
    ],
    [
      `cancelScheduledConversion`,
      (controller: AdminV2ExchangeController) =>
        controller.cancelScheduledConversion(
          actor,
          `conversion-1`,
          { version: 1, confirmed: true, passwordConfirmation: `Current1!@#abc` } as never,
          buildReq(),
        ),
      `cancelScheduledConversion`,
    ],
  ])(`%s verifies step-up before delegating`, async (_name, callEndpoint, serviceMethod) => {
    const { assertCapability, controller, service, verifyStepUp } = buildHarness();

    await expect(callEndpoint(controller)).resolves.toEqual({ ok: true });

    expect(assertCapability).toHaveBeenCalledWith(actor, `exchange.manage`);
    expect(verifyStepUp).toHaveBeenCalledWith(`admin-1`, `Current1!@#abc`);
    expect(service[serviceMethod as keyof typeof service]).toHaveBeenCalled();
  });
});
