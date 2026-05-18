import { BadRequestException, NotFoundException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { type AdminExchangeConversionPersistenceRepository } from './admin-exchange-conversion-persistence.repository';
import { ExchangeConversionExecutor } from './exchange-conversion-executor';
import { envs } from '../../envs';
import { BalanceCalculationMode, type BalanceCalculationService } from '../../shared/balance-calculation.service';

describe(`ExchangeConversionExecutor`, () => {
  const originalMaxRateAgeHours = envs.EXCHANGE_RATE_MAX_AGE_HOURS;
  const now = new Date(`2026-04-17T12:00:00.000Z`);
  const tx = { kind: `tx` };

  afterEach(() => {
    envs.EXCHANGE_RATE_MAX_AGE_HOURS = originalMaxRateAgeHours;
  });

  function buildExecutor() {
    const calls: string[] = [];
    const persistenceRepository = {
      acquireConversionAdvisoryLock: jest.fn(async () => {
        calls.push(`advisoryLock`);
      }),
      findApprovedRateForConversion: jest.fn(async () => {
        calls.push(`rateLookup`);
        return {
          id: `rate-1`,
          rate: 0.92345,
          fetchedAt: new Date(`2026-04-17T11:45:00.000Z`),
          effectiveAt: new Date(`2026-04-17T11:45:00.000Z`),
          createdAt: new Date(`2026-04-17T11:40:00.000Z`),
        };
      }),
      createConversionLedgerEntries: jest.fn(async () => {
        calls.push(`ledgerEntries`);
        return { entryId: `entry-target` };
      }),
    };
    const balanceService = {
      calculateInTransaction: jest.fn(async () => {
        calls.push(`balance`);
        return 100;
      }),
    };

    return {
      balanceService,
      calls,
      executor: new ExchangeConversionExecutor(
        persistenceRepository as unknown as AdminExchangeConversionPersistenceRepository,
        balanceService as unknown as BalanceCalculationService,
      ),
      persistenceRepository,
    };
  }

  function buildParams(overrides: Partial<Parameters<ExchangeConversionExecutor[`executeInTransaction`]>[1]> = {}) {
    return {
      consumerId: `consumer-1`,
      fromCurrency: $Enums.CurrencyCode.USD,
      toCurrency: $Enums.CurrencyCode.EUR,
      amount: 25,
      now,
      createdBy: `admin-1`,
      updatedBy: `admin-1`,
      idempotencyKeyPrefix: `idem-1`,
      metadata: { source: `admin_scheduled_force_execute`, scheduledConversionId: `scheduled-1` },
      ...overrides,
    };
  }

  it(`preserves advisory lock, rate lookup, balance, and ledger creation order`, async () => {
    const { balanceService, calls, executor, persistenceRepository } = buildExecutor();

    const result = await executor.executeInTransaction(tx as never, buildParams());

    expect(calls).toEqual([`advisoryLock`, `rateLookup`, `balance`, `ledgerEntries`]);
    expect(persistenceRepository.acquireConversionAdvisoryLock).toHaveBeenCalledWith(tx, `consumer-1`);
    expect(balanceService.calculateInTransaction).toHaveBeenCalledWith(tx, `consumer-1`, $Enums.CurrencyCode.USD, {
      mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
    });
    expect(result).toEqual({
      ledgerId: expect.any(String),
      entryId: `entry-target`,
      targetAmount: 23.09,
    });
  });

  it(`preserves ledger idempotency keys and metadata shape`, async () => {
    const { executor, persistenceRepository } = buildExecutor();

    await executor.executeInTransaction(tx as never, buildParams());

    expect(persistenceRepository.createConversionLedgerEntries).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        sourceIdempotencyKey: `idem-1:source`,
        targetIdempotencyKey: `idem-1:target`,
        sourceAmount: 25,
        targetAmount: 23.09,
        metadata: {
          from: $Enums.CurrencyCode.USD,
          to: $Enums.CurrencyCode.EUR,
          rate: 0.92345,
          rateId: `rate-1`,
          source: `admin_scheduled_force_execute`,
          scheduledConversionId: `scheduled-1`,
        },
      }),
    );
  });

  it(`rejects same-currency and invalid amount before taking advisory locks`, async () => {
    const { executor, persistenceRepository } = buildExecutor();

    await expect(
      executor.executeInTransaction(
        tx as never,
        buildParams({ fromCurrency: $Enums.CurrencyCode.USD, toCurrency: $Enums.CurrencyCode.USD }),
      ),
    ).rejects.toMatchObject({ response: { message: errorCodes.CANNOT_CONVERT_SAME_CURRENCY } });
    await expect(executor.executeInTransaction(tx as never, buildParams({ amount: 0 }))).rejects.toMatchObject({
      response: { message: errorCodes.INVALID_AMOUNT_CONVERT },
    });

    expect(persistenceRepository.acquireConversionAdvisoryLock).not.toHaveBeenCalled();
  });

  it(`rejects missing or stale rates after advisory lock and before balance reads`, async () => {
    const { balanceService, executor, persistenceRepository } = buildExecutor();
    persistenceRepository.findApprovedRateForConversion.mockResolvedValueOnce(null);

    await expect(executor.executeInTransaction(tx as never, buildParams())).rejects.toBeInstanceOf(NotFoundException);
    expect(balanceService.calculateInTransaction).not.toHaveBeenCalled();

    envs.EXCHANGE_RATE_MAX_AGE_HOURS = 1;
    persistenceRepository.findApprovedRateForConversion.mockResolvedValueOnce({
      id: `rate-stale`,
      rate: 0.9,
      fetchedAt: new Date(`2026-04-17T10:00:00.000Z`),
      effectiveAt: new Date(`2026-04-17T10:00:00.000Z`),
      createdAt: new Date(`2026-04-17T10:00:00.000Z`),
    });

    await expect(executor.executeInTransaction(tx as never, buildParams())).rejects.toBeInstanceOf(BadRequestException);
    expect(balanceService.calculateInTransaction).not.toHaveBeenCalled();
  });

  it(`rejects insufficient balance before ledger entry creation`, async () => {
    const { balanceService, executor, persistenceRepository } = buildExecutor();
    balanceService.calculateInTransaction.mockResolvedValueOnce(24);

    await expect(executor.executeInTransaction(tx as never, buildParams({ amount: 25 }))).rejects.toMatchObject({
      response: { message: errorCodes.INSUFFICIENT_CURRENCY_BALANCE },
    });

    expect(persistenceRepository.createConversionLedgerEntries).not.toHaveBeenCalled();
  });
});
