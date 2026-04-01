import { BadRequestException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerExchangeService } from './consumer-exchange.service';

describe(`ConsumerExchangeService.runAutoConversionRuleNow`, () => {
  const rule = {
    id: `rule-1`,
    consumerId: `consumer-1`,
    fromCurrency: $Enums.CurrencyCode.USD,
    toCurrency: $Enums.CurrencyCode.EUR,
    targetBalance: 10,
    maxConvertAmount: null,
    minIntervalMinutes: 30,
    nextRunAt: new Date(`2026-03-31T10:00:00.000Z`),
    deletedAt: null,
  };

  function createService(prismaOverrides?: Record<string, unknown>) {
    const prisma = {
      walletAutoConversionRuleModel: {
        findFirst: jest.fn().mockResolvedValue(rule),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      ...prismaOverrides,
    } as any;
    const balanceService = {} as any;

    return {
      service: new ConsumerExchangeService(prisma, balanceService),
      prisma,
    };
  }

  it(`rejects a second overlapping manual claim`, async () => {
    const { service, prisma } = createService({
      walletAutoConversionRuleModel: {
        findFirst: jest.fn().mockResolvedValue(rule),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn(),
      },
    });

    await expect(service.runAutoConversionRuleNow(rule.id, { source: `manual` })).rejects.toEqual(
      expect.objectContaining({
        response: expect.objectContaining({
          message: errorCodes.CONVERSION_ALREADY_PROCESSING,
        }),
      }),
    );
    expect(prisma.walletAutoConversionRuleModel.update).not.toHaveBeenCalled();
  });

  it(`claims the rule by matching its previously read nextRunAt value`, async () => {
    const { service, prisma } = createService();
    jest.spyOn(service as any, `executeAutoConversionRule`).mockResolvedValue({
      ruleId: rule.id,
      converted: false,
      reason: `balance_below_target`,
    });

    await service.runAutoConversionRuleNow(rule.id, { source: `manual` });

    expect(prisma.walletAutoConversionRuleModel.updateMany).toHaveBeenCalledWith({
      where: {
        id: rule.id,
        deletedAt: null,
        nextRunAt: rule.nextRunAt,
      },
      data: expect.objectContaining({
        lastRunAt: expect.any(Date),
        nextRunAt: expect.any(Date),
      }),
    });
  });

  it(`re-reads the latest rule values after claiming before executing`, async () => {
    const refreshedRule = {
      ...rule,
      fromCurrency: $Enums.CurrencyCode.GBP,
      toCurrency: $Enums.CurrencyCode.USD,
      targetBalance: 25,
      maxConvertAmount: 40,
    };
    const { service, prisma } = createService({
      walletAutoConversionRuleModel: {
        findFirst: jest.fn().mockResolvedValueOnce(rule).mockResolvedValueOnce(refreshedRule),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
      },
    });
    const executeSpy = jest.spyOn(service as any, `executeAutoConversionRule`).mockResolvedValue({
      ruleId: rule.id,
      converted: false,
      reason: `balance_below_target`,
    });

    await service.runAutoConversionRuleNow(rule.id, { source: `manual` });

    expect(prisma.walletAutoConversionRuleModel.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        id: rule.id,
        deletedAt: null,
      },
    });
    expect(executeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        fromCurrency: $Enums.CurrencyCode.GBP,
        toCurrency: $Enums.CurrencyCode.USD,
        targetBalance: 25,
        maxConvertAmount: 40,
      }),
      expect.any(Object),
    );
  });

  it(`reschedules a failed manual run for a near-term retry`, async () => {
    const conversionError = new BadRequestException(errorCodes.INSUFFICIENT_CURRENCY_BALANCE);
    const { service, prisma } = createService();
    jest.spyOn(service as any, `executeAutoConversionRule`).mockRejectedValue(conversionError);

    await expect(service.runAutoConversionRuleNow(rule.id, { source: `manual` })).rejects.toBe(conversionError);
    expect(prisma.walletAutoConversionRuleModel.update).toHaveBeenCalledWith({
      where: { id: rule.id },
      data: {
        nextRunAt: expect.any(Date),
      },
    });
  });
});
