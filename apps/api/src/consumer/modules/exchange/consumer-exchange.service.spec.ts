import { BadRequestException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { ConsumerExchangeService } from './consumer-exchange.service';

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
          $queryRaw: createQueryRawMock(),
          ledgerEntryModel: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: `e-1`, ledgerId: `l-1` }),
          },
        };
        return fn(tx);
      }),
    } as any;

    const service = new ConsumerExchangeService(prisma);

    await expect(
      service.convert(consumerId, { from: $Enums.CurrencyCode.USD, to: $Enums.CurrencyCode.EUR, amount: 50 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe(`ConsumerExchangeService.getBalanceByCurrency`, () => {
  it(`returns balance by currency using effective status (outcome or entry)`, async () => {
    const consumerId = `consumer-1`;
    const queryRaw = jest.fn().mockResolvedValue([{ currency_code: $Enums.CurrencyCode.USD, sum_amount: `100` }]);
    const prisma = { $queryRaw: queryRaw } as any;
    const service = new ConsumerExchangeService(prisma);

    const result = await service.getBalanceByCurrency(consumerId);

    expect(queryRaw).toHaveBeenCalled();
    expect(result).toEqual({ USD: 100 });
  });
});
