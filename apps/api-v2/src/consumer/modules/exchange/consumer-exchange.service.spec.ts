import { BadRequestException, NotFoundException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerExchangeService } from './consumer-exchange.service';
import { BalanceCalculationMode } from '../../../shared/balance-calculation.service';

function createExchangeRateRecord(overrides?: Partial<Record<string, unknown>>) {
  return {
    rate: 1,
    rateBid: null,
    spreadBps: null,
    status: $Enums.ExchangeRateStatus.APPROVED,
    effectiveAt: new Date(),
    expiresAt: null,
    fetchedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

function createRateLookupService() {
  const now = Date.now();
  const rates = new Map([
    [`USD-EUR`, createExchangeRateRecord({ rate: 0.95, fetchedAt: new Date(now) })],
    [`EUR-USD`, createExchangeRateRecord({ rate: 1.0576, fetchedAt: new Date(now) })],
    [`USD-GBP`, createExchangeRateRecord({ rate: 0.82, fetchedAt: new Date(now - 48 * 60 * 60 * 1000) })],
  ]);

  const prisma = {
    exchangeRateModel: {
      findFirst: jest.fn().mockImplementation(({ where }: { where: { fromCurrency: string; toCurrency: string } }) => {
        return Promise.resolve(rates.get(`${where.fromCurrency}-${where.toCurrency}`) ?? null);
      }),
    },
  } as any;

  const balanceService = {} as any;

  return {
    service: new ConsumerExchangeService(prisma, balanceService),
    prisma,
  };
}

describe(`ConsumerExchangeService.convert`, () => {
  it(`throws INSUFFICIENT_CURRENCY_BALANCE when balance inside transaction is less than amount`, async () => {
    const consumerId = `consumer-1`;

    // Mock query that handles both advisory lock and balance check
    const queryToStr = (q: unknown): string =>
      typeof q === `string`
        ? q
        : q && typeof q === `object` && (q as any).strings
          ? (q as any).strings.join(`?`)
          : String(q);
    const createQueryRawMock = () =>
      jest.fn().mockImplementation((query) => {
        const queryStr = queryToStr(query);
        if (queryStr.includes(`pg_advisory_xact_lock`)) return Promise.resolve([]);
        if (queryStr.includes(`SUM(amount)`) || queryStr.includes(`SUM(le.amount)`))
          return Promise.resolve([{ balance: 0 }]);
        return Promise.resolve(undefined);
      });

    const queryRawMock = createQueryRawMock();

    const prisma = {
      ledgerEntryModel: {
        groupBy: jest.fn().mockResolvedValue([{ currencyCode: $Enums.CurrencyCode.USD, _sum: { amount: 100 } }]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      exchangeRateModel: {
        findFirst: jest.fn().mockResolvedValue({
          rate: 1,
          rateBid: null,
          spreadBps: null,
          status: $Enums.ExchangeRateStatus.APPROVED,
          effectiveAt: new Date(),
          expiresAt: null,
          fetchedAt: new Date(),
          createdAt: new Date(),
        }),
      },
      $queryRaw: queryRawMock,
      $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          $executeRaw: jest.fn().mockResolvedValue(undefined),
          $queryRaw: createQueryRawMock(),
          ledgerEntryModel: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: `e-1`, ledgerId: `l-1` }),
          },
        };
        return fn(tx);
      }),
    } as any;

    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: { USD: 100 } }),
      calculateInTransaction: jest.fn().mockResolvedValue(0),
    } as any;

    const service = new ConsumerExchangeService(prisma, balanceService);

    await expect(
      service.convert(consumerId, { from: $Enums.CurrencyCode.USD, to: $Enums.CurrencyCode.EUR, amount: 50 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(balanceService.calculateInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      consumerId,
      $Enums.CurrencyCode.USD,
      {
        mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
      },
    );
  });
});

describe(`ConsumerExchangeService.getBalanceByCurrency`, () => {
  it(`returns balance by currency using effective status (outcome or entry)`, async () => {
    const consumerId = `consumer-1`;
    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: { USD: 100 } }),
    } as any;
    const prisma = {} as any;
    const service = new ConsumerExchangeService(prisma, balanceService);

    const result = await service.getBalanceByCurrency(consumerId);

    expect(balanceService.calculateMultiCurrency).toHaveBeenCalledWith(consumerId);
    expect(result).toEqual({ USD: 100 });
  });
});

describe(`ConsumerExchangeService.getCurrencies`, () => {
  it(`returns structured currency items for the consumer contract`, () => {
    const prisma = {} as any;
    const balanceService = {} as any;
    const service = new ConsumerExchangeService(prisma, balanceService);

    expect(service.getCurrencies()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: $Enums.CurrencyCode.USD, symbol: `$` }),
        expect.objectContaining({ code: $Enums.CurrencyCode.EUR, symbol: `€` }),
      ]),
    );
  });
});

describe(`ConsumerExchangeService.getRatesBatch`, () => {
  it(`returns all success rows when every pair has a live rate`, async () => {
    const { service } = createRateLookupService();

    const result = await service.getRatesBatch([
      { from: $Enums.CurrencyCode.USD, to: $Enums.CurrencyCode.EUR },
      { from: $Enums.CurrencyCode.EUR, to: $Enums.CurrencyCode.USD },
    ]);

    expect(result).toEqual({
      data: [
        { from: $Enums.CurrencyCode.USD, to: $Enums.CurrencyCode.EUR, rate: 0.95 },
        { from: $Enums.CurrencyCode.EUR, to: $Enums.CurrencyCode.USD, rate: 1.0576 },
      ],
    });
  });

  it(`returns partial success when one pair is unavailable`, async () => {
    const { service } = createRateLookupService();

    const result = await service.getRatesBatch([
      { from: $Enums.CurrencyCode.USD, to: $Enums.CurrencyCode.EUR },
      { from: $Enums.CurrencyCode.GBP, to: $Enums.CurrencyCode.AUD },
    ]);

    expect(result).toEqual({
      data: [
        { from: $Enums.CurrencyCode.USD, to: $Enums.CurrencyCode.EUR, rate: 0.95 },
        { from: $Enums.CurrencyCode.GBP, to: $Enums.CurrencyCode.AUD, code: errorCodes.RATE_NOT_AVAILABLE },
      ],
    });
  });

  it(`returns partial success when one pair is stale`, async () => {
    const { service } = createRateLookupService();

    const result = await service.getRatesBatch([
      { from: $Enums.CurrencyCode.USD, to: $Enums.CurrencyCode.EUR },
      { from: $Enums.CurrencyCode.USD, to: $Enums.CurrencyCode.GBP },
    ]);

    expect(result).toEqual({
      data: [
        { from: $Enums.CurrencyCode.USD, to: $Enums.CurrencyCode.EUR, rate: 0.95 },
        { from: $Enums.CurrencyCode.USD, to: $Enums.CurrencyCode.GBP, code: errorCodes.RATE_STALE },
      ],
    });
  });
});

describe(`ConsumerExchangeService.getRate`, () => {
  it(`still throws RATE_NOT_AVAILABLE outside the batch path`, async () => {
    const { service } = createRateLookupService();

    await expect(service.getRate($Enums.CurrencyCode.GBP, $Enums.CurrencyCode.AUD)).rejects.toEqual(
      expect.objectContaining({
        response: expect.objectContaining({
          message: errorCodes.RATE_NOT_AVAILABLE,
        }),
      }),
    );
  });

  it(`still throws RATE_STALE outside the batch path`, async () => {
    const { service } = createRateLookupService();

    await expect(service.getRate($Enums.CurrencyCode.USD, $Enums.CurrencyCode.GBP)).rejects.toEqual(
      expect.objectContaining({
        response: expect.objectContaining({
          message: errorCodes.RATE_STALE,
        }),
      }),
    );
  });

  it(`keeps the same exception types outside the batch path`, async () => {
    const { service } = createRateLookupService();

    await expect(service.getRate($Enums.CurrencyCode.GBP, $Enums.CurrencyCode.AUD)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.getRate($Enums.CurrencyCode.USD, $Enums.CurrencyCode.GBP)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
