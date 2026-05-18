import { BadRequestException, NotFoundException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerAutoConversionRuleService } from './consumer-auto-conversion-rule.service';

function createRule(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: `rule-1`,
    consumerId: `consumer-1`,
    fromCurrency: $Enums.CurrencyCode.USD,
    toCurrency: $Enums.CurrencyCode.EUR,
    targetBalance: 10,
    maxConvertAmount: null,
    minIntervalMinutes: 30,
    enabled: true,
    nextRunAt: new Date(`2026-03-31T10:00:00.000Z`),
    metadata: null,
    deletedAt: null,
    ...overrides,
  };
}

function createService() {
  const balanceService = {
    calculateMultiCurrency: jest.fn().mockResolvedValue({ USD: 100 }),
  } as any;
  const conversionService = {
    convertInternal: jest.fn().mockResolvedValue({ ledgerId: `ledger-1` }),
  } as any;
  const automationRepository = {
    countAutoConversionRules: jest.fn().mockResolvedValue(0),
    listAutoConversionRules: jest.fn().mockResolvedValue([]),
    createAutoConversionRule: jest.fn().mockImplementation((data) =>
      Promise.resolve(
        createRule({
          id: `created-rule`,
          ...data,
        }),
      ),
    ),
    findActiveAutoConversionRule: jest.fn().mockResolvedValue(createRule()),
    updateAutoConversionRule: jest.fn().mockImplementation((ruleId, data) =>
      Promise.resolve(
        createRule({
          id: ruleId,
          ...data,
        }),
      ),
    ),
    softDeleteAutoConversionRule: jest.fn().mockResolvedValue(undefined),
    findDueAutoConversionRules: jest.fn().mockResolvedValue([]),
    claimDueAutoConversionRule: jest.fn().mockResolvedValue(true),
    findExecutableAutoConversionRule: jest.fn().mockResolvedValue(createRule()),
    updateAutoConversionRuleMetadata: jest.fn().mockResolvedValue(undefined),
    rescheduleAutoConversionRuleFailure: jest.fn().mockResolvedValue(undefined),
    findAutoConversionRuleById: jest.fn().mockResolvedValue(createRule()),
    claimAutoConversionRuleNow: jest.fn().mockResolvedValue(true),
  } as any;
  const service = new ConsumerAutoConversionRuleService(balanceService, conversionService, automationRepository);

  jest
    .spyOn((service as unknown as { logger: { debug: (...args: unknown[]) => void } }).logger, `debug`)
    .mockImplementation(() => undefined);
  jest
    .spyOn((service as unknown as { logger: { warn: (...args: unknown[]) => void } }).logger, `warn`)
    .mockImplementation(() => undefined);
  jest
    .spyOn((service as unknown as { logger: { log: (...args: unknown[]) => void } }).logger, `log`)
    .mockImplementation(() => undefined);

  return { service, balanceService, conversionService, automationRepository };
}

describe(`ConsumerAutoConversionRuleService`, () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it(`normalizes pagination and rule rows`, async () => {
    const { service, automationRepository } = createService();
    automationRepository.countAutoConversionRules.mockResolvedValueOnce(1);
    automationRepository.listAutoConversionRules.mockResolvedValueOnce([
      createRule({ id: `rule-2`, targetBalance: `25.50`, maxConvertAmount: `5.25` }),
    ]);

    const result = await service.listAutoConversionRules(`consumer-1`, -2, 500);

    expect(automationRepository.listAutoConversionRules).toHaveBeenCalledWith(`consumer-1`, 0, 100);
    expect(result).toEqual({
      items: [
        {
          id: `rule-2`,
          fromCurrency: $Enums.CurrencyCode.USD,
          toCurrency: $Enums.CurrencyCode.EUR,
          targetBalance: 25.5,
          maxConvertAmount: 5.25,
          minIntervalMinutes: 30,
          enabled: true,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 100,
    });
  });

  it.each([
    {
      body: { from: $Enums.CurrencyCode.USD, to: $Enums.CurrencyCode.USD, targetBalance: 0 },
      code: errorCodes.CURRENCIES_MUST_DIFFER_CREATE_RULE,
    },
    {
      body: { from: $Enums.CurrencyCode.USD, to: $Enums.CurrencyCode.EUR, targetBalance: -1 },
      code: errorCodes.INVALID_TARGET_BALANCE_CREATE_RULE,
    },
    {
      body: {
        from: $Enums.CurrencyCode.USD,
        to: $Enums.CurrencyCode.EUR,
        targetBalance: 0,
        maxConvertAmount: 0,
      },
      code: errorCodes.INVALID_MAX_CONVERT_AMOUNT_CREATE_RULE,
    },
  ])(`rejects invalid create request with $code`, async ({ body, code }) => {
    const { service, automationRepository } = createService();

    await expect(service.createAutoConversionRule(`consumer-1`, body)).rejects.toMatchObject({
      response: { message: code },
    });
    expect(automationRepository.createAutoConversionRule).not.toHaveBeenCalled();
  });

  it(`creates a rule with unchanged defaults and repository shape`, async () => {
    const { service, automationRepository } = createService();

    const result = await service.createAutoConversionRule(`consumer-1`, {
      from: $Enums.CurrencyCode.USD,
      to: $Enums.CurrencyCode.EUR,
      targetBalance: 25,
    });

    expect(automationRepository.createAutoConversionRule).toHaveBeenCalledWith({
      consumerId: `consumer-1`,
      fromCurrency: $Enums.CurrencyCode.USD,
      toCurrency: $Enums.CurrencyCode.EUR,
      targetBalance: 25,
      maxConvertAmount: null,
      minIntervalMinutes: 60,
      nextRunAt: expect.any(Date),
      enabled: true,
    });
    expect(result).toMatchObject({
      id: `created-rule`,
      targetBalance: 25,
      maxConvertAmount: null,
      minIntervalMinutes: 60,
      enabled: true,
    });
  });

  it(`updates a rule while preserving fallback and null max amount semantics`, async () => {
    const { service, automationRepository } = createService();
    const existingNextRunAt = new Date(`2026-03-31T10:00:00.000Z`);
    automationRepository.findActiveAutoConversionRule.mockResolvedValueOnce(
      createRule({
        fromCurrency: $Enums.CurrencyCode.USD,
        toCurrency: $Enums.CurrencyCode.EUR,
        minIntervalMinutes: 30,
        nextRunAt: existingNextRunAt,
      }),
    );

    await service.updateAutoConversionRule(`consumer-1`, `rule-1`, {
      targetBalance: 50,
      maxConvertAmount: null,
      enabled: false,
    });

    expect(automationRepository.updateAutoConversionRule).toHaveBeenCalledWith(`rule-1`, {
      fromCurrency: $Enums.CurrencyCode.USD,
      toCurrency: $Enums.CurrencyCode.EUR,
      targetBalance: 50,
      maxConvertAmount: null,
      minIntervalMinutes: 30,
      enabled: false,
      nextRunAt: existingNextRunAt,
    });
  });

  it(`rejects missing delete and soft-deletes active rules`, async () => {
    const { service, automationRepository } = createService();
    automationRepository.findActiveAutoConversionRule.mockResolvedValueOnce(null);

    await expect(service.deleteAutoConversionRule(`consumer-1`, `missing`)).rejects.toBeInstanceOf(NotFoundException);

    automationRepository.findActiveAutoConversionRule.mockResolvedValueOnce(createRule());
    await expect(service.deleteAutoConversionRule(`consumer-1`, `rule-1`)).resolves.toEqual({ ruleId: `rule-1` });
    expect(automationRepository.softDeleteAutoConversionRule).toHaveBeenCalledWith(`rule-1`, expect.any(Date));
  });

  it(`claims due rules, re-reads executable values, and writes execution metadata`, async () => {
    const { service, automationRepository } = createService();
    automationRepository.findDueAutoConversionRules.mockResolvedValueOnce([
      createRule({ id: `skip-me` }),
      createRule({ id: `changed-me`, metadata: { existing: true } }),
      createRule({ id: `execute-me`, metadata: { existing: true } }),
    ]);
    automationRepository.claimDueAutoConversionRule
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    automationRepository.findExecutableAutoConversionRule
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createRule({ id: `execute-me`, metadata: { existing: true } }));
    jest.spyOn(service, `executeAutoConversionRule`).mockResolvedValueOnce({
      ruleId: `execute-me`,
      converted: true,
      ledgerId: `ledger-1`,
    });

    await service.processDueAutoConversionRules();

    expect(automationRepository.findExecutableAutoConversionRule).toHaveBeenCalledWith(`changed-me`, {
      requireEnabled: true,
    });
    expect(automationRepository.findExecutableAutoConversionRule).toHaveBeenCalledWith(`execute-me`, {
      requireEnabled: true,
    });
    expect(automationRepository.updateAutoConversionRuleMetadata).toHaveBeenCalledWith(
      `execute-me`,
      expect.objectContaining({
        existing: true,
        lastExecution: expect.objectContaining({
          status: `executed`,
          reason: `conversion_executed`,
          source: `auto_rule`,
          ledgerId: `ledger-1`,
        }),
      }),
    );
  });

  it(`reschedules due rule failures with merged metadata`, async () => {
    const { service, automationRepository } = createService();
    automationRepository.findDueAutoConversionRules.mockResolvedValueOnce([
      createRule({ id: `fail-me`, metadata: { existing: true } }),
    ]);
    jest.spyOn(service, `executeAutoConversionRule`).mockRejectedValueOnce(new Error(`boom`));

    await service.processDueAutoConversionRules();

    expect(automationRepository.rescheduleAutoConversionRuleFailure).toHaveBeenCalledWith(
      `fail-me`,
      expect.any(Date),
      expect.objectContaining({
        existing: true,
        lastExecution: expect.objectContaining({
          status: `failed`,
          reason: `boom`,
          source: `auto_rule`,
        }),
      }),
    );
  });

  it(`claims manual rule run with expected nextRunAt and re-reads before execution`, async () => {
    const { service, automationRepository } = createService();
    const refreshedRule = createRule({
      fromCurrency: $Enums.CurrencyCode.GBP,
      toCurrency: $Enums.CurrencyCode.USD,
      targetBalance: 25,
      maxConvertAmount: 40,
    });
    automationRepository.findAutoConversionRuleById.mockResolvedValueOnce(createRule());
    automationRepository.findExecutableAutoConversionRule.mockResolvedValueOnce(refreshedRule);
    const executeSpy = jest.spyOn(service, `executeAutoConversionRule`).mockResolvedValueOnce({
      ruleId: `rule-1`,
      converted: false,
      reason: `balance_below_target`,
    });

    await service.runAutoConversionRuleNow(`rule-1`, { source: `manual`, actorId: `admin-1` });

    expect(automationRepository.claimAutoConversionRuleNow).toHaveBeenCalledWith({
      ruleId: `rule-1`,
      now: expect.any(Date),
      minIntervalMinutes: 30,
      expectedNextRunAt: new Date(`2026-03-31T10:00:00.000Z`),
    });
    expect(executeSpy).toHaveBeenCalledWith(refreshedRule, { source: `manual`, actorId: `admin-1` });
    expect(automationRepository.updateAutoConversionRuleMetadata).toHaveBeenCalledWith(
      `rule-1`,
      expect.objectContaining({
        lastExecution: expect.objectContaining({
          status: `failed`,
          reason: `balance_below_target`,
          source: `manual`,
          actorId: `admin-1`,
          ledgerId: null,
        }),
      }),
    );
  });

  it(`rejects overlapping manual rule runs`, async () => {
    const { service, automationRepository } = createService();
    automationRepository.claimAutoConversionRuleNow.mockResolvedValueOnce(false);

    await expect(service.runAutoConversionRuleNow(`rule-1`, { source: `manual` })).rejects.toMatchObject({
      response: { message: errorCodes.CONVERSION_ALREADY_PROCESSING },
    });
    expect(automationRepository.findExecutableAutoConversionRule).not.toHaveBeenCalled();
  });

  it(`returns balance threshold reasons without converting`, async () => {
    const { service, balanceService, conversionService } = createService();
    balanceService.calculateMultiCurrency.mockResolvedValueOnce({ USD: 10 });

    await expect(
      service.executeAutoConversionRule(createRule({ targetBalance: 10 }), { source: `auto_rule` }),
    ).resolves.toEqual({
      ruleId: `rule-1`,
      converted: false,
      reason: `balance_below_target`,
    });
    expect(conversionService.convertInternal).not.toHaveBeenCalled();
  });

  it(`caps conversion amount and preserves rule idempotency prefix metadata`, async () => {
    const { service, conversionService } = createService();

    await expect(
      service.executeAutoConversionRule(createRule({ targetBalance: 25, maxConvertAmount: 40 }), {
        source: `manual_rule_run`,
        actorId: `admin-1`,
      }),
    ).resolves.toEqual({
      ruleId: `rule-1`,
      converted: true,
      ledgerId: `ledger-1`,
    });

    expect(conversionService.convertInternal).toHaveBeenCalledWith(
      `consumer-1`,
      {
        from: $Enums.CurrencyCode.USD,
        to: $Enums.CurrencyCode.EUR,
        amount: 40,
      },
      {
        metadata: {
          source: `manual_rule_run`,
          initiatedBy: `admin-1`,
          ruleId: `rule-1`,
          runAt: expect.any(String),
        },
        idempotencyKeyPrefix: expect.stringMatching(/^rule:rule-1:/),
      },
    );
  });
});
