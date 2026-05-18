import { NotFoundException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerCurrencyConversionService } from './consumer-currency-conversion.service';
import { BalanceCalculationMode } from '../../../shared/balance-calculation.service';

function createService() {
  const balanceService = {
    calculateInTransaction: jest.fn().mockResolvedValue(100),
  } as any;
  const rateService = {
    getRate: jest.fn().mockResolvedValue({ rate: 0.95 }),
  } as any;
  const executionRepository = {
    executeExchange: jest.fn().mockResolvedValue({ ledgerId: `ledger-1` }),
  } as any;

  return {
    service: new ConsumerCurrencyConversionService(balanceService, rateService, executionRepository),
    balanceService,
    rateService,
    executionRepository,
  };
}

describe(`ConsumerCurrencyConversionService`, () => {
  it(`rejects same-currency conversions before rate lookup`, async () => {
    const { service, rateService, executionRepository } = createService();

    await expect(
      service.convertInternal(`consumer-1`, {
        from: $Enums.CurrencyCode.USD,
        to: $Enums.CurrencyCode.USD,
        amount: 10,
      }),
    ).rejects.toMatchObject({
      response: {
        message: errorCodes.CANNOT_CONVERT_SAME_CURRENCY,
      },
    });

    expect(rateService.getRate).not.toHaveBeenCalled();
    expect(executionRepository.executeExchange).not.toHaveBeenCalled();
  });

  it.each([0, -1, Number.NaN])(`rejects invalid amount %s before rate lookup`, async (amount) => {
    const { service, rateService, executionRepository } = createService();

    await expect(
      service.convertInternal(`consumer-1`, {
        from: $Enums.CurrencyCode.USD,
        to: $Enums.CurrencyCode.EUR,
        amount,
      }),
    ).rejects.toMatchObject({
      response: {
        message: errorCodes.INVALID_AMOUNT_CONVERT,
      },
    });

    expect(rateService.getRate).not.toHaveBeenCalled();
    expect(executionRepository.executeExchange).not.toHaveBeenCalled();
  });

  it(`propagates rate lookup not found errors without executing exchange`, async () => {
    const { service, rateService, executionRepository } = createService();
    rateService.getRate.mockRejectedValueOnce(new NotFoundException(errorCodes.RATE_NOT_AVAILABLE));

    await expect(
      service.convertInternal(`consumer-1`, {
        from: $Enums.CurrencyCode.USD,
        to: $Enums.CurrencyCode.EUR,
        amount: 10,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(rateService.getRate).toHaveBeenCalledWith($Enums.CurrencyCode.USD, $Enums.CurrencyCode.EUR);
    expect(executionRepository.executeExchange).not.toHaveBeenCalled();
  });

  it(`passes manual conversion metadata and no idempotency keys to the execution repository`, async () => {
    const { service, executionRepository } = createService();

    await expect(
      service.convert(`consumer-1`, {
        from: $Enums.CurrencyCode.USD,
        to: $Enums.CurrencyCode.EUR,
        amount: 10,
      }),
    ).resolves.toEqual({ ledgerId: `ledger-1` });

    expect(executionRepository.executeExchange).toHaveBeenCalledWith(
      expect.objectContaining({
        consumerId: `consumer-1`,
        from: $Enums.CurrencyCode.USD,
        to: $Enums.CurrencyCode.EUR,
        amount: 10,
        rate: 0.95,
        metadata: {
          from: $Enums.CurrencyCode.USD,
          to: $Enums.CurrencyCode.EUR,
          rate: 0.95,
          source: `manual`,
        },
        sourceIdempotencyKey: undefined,
        targetIdempotencyKey: undefined,
      }),
    );
  });

  it(`passes prefixed idempotency keys and merges metadata after rate metadata`, async () => {
    const { service, executionRepository } = createService();

    await service.convertInternal(
      `consumer-1`,
      {
        from: $Enums.CurrencyCode.USD,
        to: $Enums.CurrencyCode.EUR,
        amount: 10,
      },
      {
        idempotencyKeyPrefix: `scheduled:scheduled-1`,
        metadata: {
          source: `scheduled`,
          scheduledConversionId: `scheduled-1`,
        },
      },
    );

    expect(executionRepository.executeExchange).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceIdempotencyKey: `scheduled:scheduled-1:source`,
        targetIdempotencyKey: `scheduled:scheduled-1:target`,
        metadata: {
          from: $Enums.CurrencyCode.USD,
          to: $Enums.CurrencyCode.EUR,
          rate: 0.95,
          source: `scheduled`,
          scheduledConversionId: `scheduled-1`,
        },
      }),
    );
  });

  it(`uses the in-transaction completed-and-pending balance check`, async () => {
    const { service, balanceService, executionRepository } = createService();
    const tx = { tx: true };
    executionRepository.executeExchange.mockImplementationOnce(async (params: any) => {
      await params.assertSufficientBalance(tx);
      return { ledgerId: `ledger-1` };
    });

    await service.convertInternal(`consumer-1`, {
      from: $Enums.CurrencyCode.USD,
      to: $Enums.CurrencyCode.EUR,
      amount: 50,
    });

    expect(balanceService.calculateInTransaction).toHaveBeenCalledWith(tx, `consumer-1`, $Enums.CurrencyCode.USD, {
      mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
    });
  });

  it(`throws insufficient balance from the transaction callback`, async () => {
    const { service, balanceService, executionRepository } = createService();
    balanceService.calculateInTransaction.mockResolvedValueOnce(49);
    executionRepository.executeExchange.mockImplementationOnce(async (params: any) => {
      await params.assertSufficientBalance({});
      return { ledgerId: `ledger-1` };
    });

    await expect(
      service.convertInternal(`consumer-1`, {
        from: $Enums.CurrencyCode.USD,
        to: $Enums.CurrencyCode.EUR,
        amount: 50,
      }),
    ).rejects.toMatchObject({
      response: {
        message: errorCodes.INSUFFICIENT_CURRENCY_BALANCE,
      },
    });
  });

  it(`preserves rule idempotency key prefix shape`, async () => {
    const { service, executionRepository } = createService();

    await service.convertInternal(
      `consumer-1`,
      {
        from: $Enums.CurrencyCode.USD,
        to: $Enums.CurrencyCode.EUR,
        amount: 10,
      },
      {
        idempotencyKeyPrefix: `rule:rule-1:2026-01-01T00:00:00.000Z`,
        metadata: {
          source: `auto_rule`,
          ruleId: `rule-1`,
        },
      },
    );

    expect(executionRepository.executeExchange).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceIdempotencyKey: `rule:rule-1:2026-01-01T00:00:00.000Z:source`,
        targetIdempotencyKey: `rule:rule-1:2026-01-01T00:00:00.000Z:target`,
      }),
    );
  });
});
