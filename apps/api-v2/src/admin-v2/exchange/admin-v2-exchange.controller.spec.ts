import { AdminV2ExchangeController } from './admin-v2-exchange.controller';

describe(`AdminV2ExchangeController`, () => {
  it(`guards exchange reads with exchange.read and exact writes with exchange.manage only`, async () => {
    const assertCapability = jest.fn(async () => ({
      role: `SUPER_ADMIN`,
      capabilities: [`exchange.read`, `exchange.manage`],
      workspaces: [`exchange`],
      source: `schema`,
    }));
    const listRates = jest.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 20 }));
    const getRateCase = jest.fn(async () => ({ id: `rate-1` }));
    const approveRate = jest.fn(async () => ({ rateId: `rate-1` }));
    const listRules = jest.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 20 }));
    const getRuleCase = jest.fn(async () => ({ id: `rule-1` }));
    const pauseRule = jest.fn(async () => ({ ruleId: `rule-1` }));
    const resumeRule = jest.fn(async () => ({ ruleId: `rule-1` }));
    const runRuleNow = jest.fn(async () => ({ ruleId: `rule-1`, summary: { status: `executed` } }));
    const listScheduledConversions = jest.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 20 }));
    const getScheduledConversionCase = jest.fn(async () => ({ id: `scheduled-1` }));
    const forceExecuteScheduledConversion = jest.fn(async () => ({ conversionId: `scheduled-1` }));
    const cancelScheduledConversion = jest.fn(async () => ({ conversionId: `scheduled-1` }));

    const controller = new AdminV2ExchangeController(
      {
        listRates,
        getRateCase,
        approveRate,
        listRules,
        getRuleCase,
        pauseRule,
        resumeRule,
        runRuleNow,
        listScheduledConversions,
        getScheduledConversionCase,
        forceExecuteScheduledConversion,
        cancelScheduledConversion,
      } as never,
      {
        assertCapability,
      } as never,
    );

    const admin = {
      id: `admin-1`,
      email: `super@example.com`,
      type: `SUPER`,
      sessionId: `session-1`,
    } as never;

    await controller.listRates(admin, {
      page: `2`,
      pageSize: `10`,
      fromCurrency: `USD`,
      toCurrency: `EUR`,
      provider: `ECB`,
      status: `APPROVED`,
      stale: `true`,
    });
    await controller.getRateCase(admin, `rate-1`);
    await controller.approveRate(
      admin,
      `rate-1`,
      { version: 10, confirmed: true, reason: `Reviewed provider spread` },
      {
        ip: `127.0.0.1`,
        headers: {
          'user-agent': `jest`,
          'idempotency-key': `11111111-1111-4111-8111-111111111111`,
        },
      } as never,
    );
    await controller.listRules(admin, {
      q: `consumer@example.com`,
      enabled: `false`,
      fromCurrency: `USD`,
      toCurrency: `EUR`,
    });
    await controller.getRuleCase(admin, `rule-1`);
    await controller.pauseRule(admin, `rule-1`, { version: 11 }, {
      ip: `127.0.0.1`,
      headers: {
        'user-agent': `jest`,
        'idempotency-key': `22222222-2222-4222-8222-222222222222`,
      },
    } as never);
    await controller.resumeRule(admin, `rule-1`, { version: 12 }, {
      ip: `127.0.0.1`,
      headers: {
        'user-agent': `jest`,
        'idempotency-key': `33333333-3333-4333-8333-333333333333`,
      },
    } as never);
    await controller.runRuleNow(admin, `rule-1`, { version: 13 }, {
      ip: `127.0.0.1`,
      headers: {
        'user-agent': `jest`,
        'idempotency-key': `44444444-4444-4444-8444-444444444444`,
      },
    } as never);
    await controller.listScheduledConversions(admin, {
      status: `FAILED`,
      q: `consumer-1`,
    });
    await controller.getScheduledConversionCase(admin, `scheduled-1`);
    await controller.forceExecuteScheduledConversion(admin, `scheduled-1`, { version: 14, confirmed: true }, {
      ip: `127.0.0.1`,
      headers: {
        'user-agent': `jest`,
        'idempotency-key': `55555555-5555-4555-8555-555555555555`,
      },
    } as never);
    await controller.cancelScheduledConversion(admin, `scheduled-1`, { version: 15, confirmed: true }, {
      ip: `127.0.0.1`,
      headers: {
        'user-agent': `jest`,
        'idempotency-key': `66666666-6666-4666-8666-666666666666`,
      },
    } as never);

    expect(assertCapability).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: `admin-1` }), `exchange.read`);
    expect(listRates).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      fromCurrency: `USD`,
      toCurrency: `EUR`,
      provider: `ECB`,
      status: `APPROVED`,
      stale: true,
    });
    expect(assertCapability).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: `admin-1` }), `exchange.read`);
    expect(getRateCase).toHaveBeenCalledWith(`rate-1`);
    expect(assertCapability).toHaveBeenNthCalledWith(3, expect.objectContaining({ id: `admin-1` }), `exchange.manage`);
    expect(approveRate).toHaveBeenCalledWith(
      `rate-1`,
      `admin-1`,
      { version: 10, confirmed: true, reason: `Reviewed provider spread` },
      expect.objectContaining({
        idempotencyKey: `11111111-1111-4111-8111-111111111111`,
      }),
    );
    expect(assertCapability).toHaveBeenNthCalledWith(4, expect.objectContaining({ id: `admin-1` }), `exchange.read`);
    expect(listRules).toHaveBeenCalledWith({
      page: undefined,
      pageSize: undefined,
      q: `consumer@example.com`,
      enabled: false,
      fromCurrency: `USD`,
      toCurrency: `EUR`,
    });
    expect(assertCapability).toHaveBeenNthCalledWith(5, expect.objectContaining({ id: `admin-1` }), `exchange.read`);
    expect(getRuleCase).toHaveBeenCalledWith(`rule-1`);
    expect(assertCapability).toHaveBeenNthCalledWith(6, expect.objectContaining({ id: `admin-1` }), `exchange.manage`);
    expect(pauseRule).toHaveBeenCalledWith(
      `rule-1`,
      `admin-1`,
      { version: 11 },
      expect.objectContaining({
        idempotencyKey: `22222222-2222-4222-8222-222222222222`,
      }),
    );
    expect(assertCapability).toHaveBeenNthCalledWith(7, expect.objectContaining({ id: `admin-1` }), `exchange.manage`);
    expect(resumeRule).toHaveBeenCalledWith(
      `rule-1`,
      `admin-1`,
      { version: 12 },
      expect.objectContaining({
        idempotencyKey: `33333333-3333-4333-8333-333333333333`,
      }),
    );
    expect(assertCapability).toHaveBeenNthCalledWith(8, expect.objectContaining({ id: `admin-1` }), `exchange.manage`);
    expect(runRuleNow).toHaveBeenCalledWith(
      `rule-1`,
      `admin-1`,
      { version: 13 },
      expect.objectContaining({
        idempotencyKey: `44444444-4444-4444-8444-444444444444`,
      }),
    );
    expect(assertCapability).toHaveBeenNthCalledWith(9, expect.objectContaining({ id: `admin-1` }), `exchange.read`);
    expect(listScheduledConversions).toHaveBeenCalledWith({
      page: undefined,
      pageSize: undefined,
      q: `consumer-1`,
      status: `FAILED`,
    });
    expect(assertCapability).toHaveBeenNthCalledWith(10, expect.objectContaining({ id: `admin-1` }), `exchange.read`);
    expect(getScheduledConversionCase).toHaveBeenCalledWith(`scheduled-1`);
    expect(assertCapability).toHaveBeenNthCalledWith(11, expect.objectContaining({ id: `admin-1` }), `exchange.manage`);
    expect(forceExecuteScheduledConversion).toHaveBeenCalledWith(
      `scheduled-1`,
      `admin-1`,
      { version: 14, confirmed: true },
      expect.objectContaining({
        idempotencyKey: `55555555-5555-4555-8555-555555555555`,
      }),
    );
    expect(assertCapability).toHaveBeenNthCalledWith(12, expect.objectContaining({ id: `admin-1` }), `exchange.manage`);
    expect(cancelScheduledConversion).toHaveBeenCalledWith(
      `scheduled-1`,
      `admin-1`,
      { version: 15, confirmed: true },
      expect.objectContaining({
        idempotencyKey: `66666666-6666-4666-8666-666666666666`,
      }),
    );
  });
});
