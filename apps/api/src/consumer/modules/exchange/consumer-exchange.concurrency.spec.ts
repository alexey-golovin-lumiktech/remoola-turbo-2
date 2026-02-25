/**
 * Concurrency tests for currency exchange operations.
 * Verifies that concurrent exchanges cannot double-spend the same balance.
 */
import { $Enums } from '@remoola/database-2';

import { ConsumerExchangeService } from './consumer-exchange.service';

describe(`ConsumerExchangeService - Concurrency Safety`, () => {
  const consumerId = `consumer-exchange-test`;
  const mockRate = { rate: 0.92, id: `rate-1` };

  // Helper to convert Prisma.sql template object to string
  const queryToString = (query: any): string => {
    if (typeof query === `string`) return query;
    if (query && typeof query === `object`) {
      if (query.strings && Array.isArray(query.strings)) {
        return query.strings.join(`?`);
      }
      return JSON.stringify(query);
    }
    return String(query);
  };

  function createMockPrisma(params: { balance: number }) {
    const { balance } = params;

    const prisma = {
      exchangeRateModel: {
        findFirst: jest.fn().mockResolvedValue(mockRate),
      },
      ledgerEntryModel: {
        groupBy: jest.fn().mockResolvedValue([{ currencyCode: $Enums.CurrencyCode.USD, _sum: { amount: balance } }]),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: `ledger-entry-1` }),
      },
      $queryRaw: jest.fn().mockImplementation((query) => {
        const queryStr = queryToString(query);
        if (queryStr.includes(`pg_advisory_xact_lock`)) {
          return Promise.resolve([]);
        }
        if (queryStr.includes(`SUM(amount)`) || queryStr.includes(`SUM(le.amount)`)) {
          return Promise.resolve([{ balance }]);
        }
        return Promise.resolve(undefined);
      }),
      $transaction: jest.fn(async (fn: (tx: any) => Promise<any>) => {
        const txQueryCallLog: string[] = [];
        const tx = {
          $queryRaw: jest.fn().mockImplementation((query) => {
            const queryStr = queryToString(query);
            txQueryCallLog.push(queryStr);
            if (queryStr.includes(`pg_advisory_xact_lock`)) {
              return Promise.resolve([]);
            }
            if (queryStr.includes(`SUM(amount)`) || queryStr.includes(`SUM(le.amount)`)) {
              return Promise.resolve([{ balance }]);
            }
            return Promise.resolve(undefined);
          }),
          ledgerEntryModel: {
            findMany: jest.fn().mockResolvedValue([]),
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: `ledger-entry-1` }),
          },
        };
        await fn(tx);
        // Expose call log on prisma mock
        (prisma.$queryRaw as any)._txCallLog = txQueryCallLog;
      }),
    } as any;

    return prisma;
  }

  function createService(prisma: any) {
    return new ConsumerExchangeService(prisma);
  }

  describe(`Exchange - Concurrent Requests`, () => {
    it(`should use operation-specific advisory lock key`, async () => {
      const prisma = createMockPrisma({ balance: 1000 });
      const service = createService(prisma);

      await service.convert(consumerId, {
        from: $Enums.CurrencyCode.USD,
        to: $Enums.CurrencyCode.EUR,
        amount: 100,
      });

      const txCallLog = (prisma.$queryRaw as any)._txCallLog as string[];
      expect(txCallLog).toBeDefined();

      const hasExchangeLock = txCallLog.some(
        (q: string) => q.includes(`pg_advisory_xact_lock`) && q.includes(`:exchange`),
      );
      expect(hasExchangeLock).toBe(true);
    });

    it(`should use SELECT FOR UPDATE for balance check`, async () => {
      const prisma = createMockPrisma({ balance: 1000 });
      const service = createService(prisma);

      await service.convert(consumerId, {
        from: $Enums.CurrencyCode.USD,
        to: $Enums.CurrencyCode.EUR,
        amount: 100,
      });

      const txCallLog = (prisma.$queryRaw as any)._txCallLog as string[];
      expect(txCallLog).toBeDefined();

      const hasForUpdate = txCallLog.some((q: string) => q.includes(`FOR UPDATE`));
      expect(hasForUpdate).toBe(true);
    });

    it(`should lock specific currency balance`, async () => {
      const prisma = createMockPrisma({ balance: 1000 });
      const service = createService(prisma);

      await service.convert(consumerId, {
        from: $Enums.CurrencyCode.USD,
        to: $Enums.CurrencyCode.EUR,
        amount: 100,
      });

      const txCallLog = (prisma.$queryRaw as any)._txCallLog as string[];
      expect(txCallLog).toBeDefined();

      const balanceCheckCalls = txCallLog.filter(
        (q: string) => (q.includes(`SUM(amount)`) || q.includes(`SUM(le.amount)`)) && q.includes(`FOR UPDATE`),
      );

      expect(balanceCheckCalls.length).toBeGreaterThan(0);
      // Should filter by specific currency
      const balanceQuery = balanceCheckCalls[0];
      expect(balanceQuery).toContain(`currency_code`);
    });
  });
});
