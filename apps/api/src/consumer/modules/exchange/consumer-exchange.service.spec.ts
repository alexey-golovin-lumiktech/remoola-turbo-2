import { $Enums } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerExchangeService } from './consumer-exchange.service';

describe(`ConsumerExchangeService.convert`, () => {
  it(`throws INSUFFICIENT_CURRENCY_BALANCE when balance inside transaction is less than amount`, async () => {
    const consumerId = `consumer-1`;
    const prisma = {
      ledgerEntryModel: {
        groupBy: jest.fn().mockResolvedValue([{ currencyCode: $Enums.CurrencyCode.USD, _sum: { amount: 100 } }]),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
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
      $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue(undefined),
          ledgerEntryModel: {
            aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
            create: jest.fn().mockResolvedValue({ id: `e-1`, ledgerId: `l-1` }),
          },
        };
        return fn(tx);
      }),
    } as any;

    const service = new ConsumerExchangeService(prisma);

    await expect(
      service.convert(consumerId, { from: $Enums.CurrencyCode.USD, to: $Enums.CurrencyCode.EUR, amount: 50 }),
    ).rejects.toMatchObject({
      response: { message: errorCodes.INSUFFICIENT_CURRENCY_BALANCE },
    });
  });
});
