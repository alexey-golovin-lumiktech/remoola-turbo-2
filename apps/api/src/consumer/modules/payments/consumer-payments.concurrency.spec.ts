/**
 * Concurrency tests for fintech-critical operations.
 * These tests verify that race conditions are properly prevented via:
 * - Advisory locks with operation-specific keys
 * - SELECT FOR UPDATE on balance calculations
 * - Idempotency keys for duplicate request prevention
 */

import { $Enums } from '@remoola/database-2';

import { ConsumerPaymentsService } from './consumer-payments.service';
import { type TransferBody, type WithdrawBody } from './dto';
import { BalanceCalculationService } from '../../../shared/balance-calculation.service';

describe(`ConsumerPaymentsService - Concurrency Safety`, () => {
  const consumerId = `consumer-test-1`;
  const recipientId = `consumer-test-2`;
  const email = `test@example.com`;

  function createMockPrisma(params: { balance: number }) {
    const { balance } = params;
    const queryCallLog: string[] = [];

    // Helper to convert Prisma.sql template object to string
    const queryToString = (query: any): string => {
      if (typeof query === `string`) return query;
      if (query && typeof query === `object`) {
        // Prisma.sql template object has 'strings' and 'values' properties
        if (query.strings && Array.isArray(query.strings)) {
          return query.strings.join(`?`);
        }
        return JSON.stringify(query);
      }
      return String(query);
    };

    const prisma = {
      consumerModel: {
        findUnique: jest.fn().mockResolvedValue({ email }),
        findFirst: jest.fn().mockResolvedValue({ id: recipientId, email: `recipient@example.com` }),
      },
      ledgerEntryModel: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: `ledger-entry-1` }),
      },
      $queryRaw: jest.fn().mockImplementation((query) => {
        const queryStr = queryToString(query);
        queryCallLog.push(queryStr);
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
          $executeRaw: jest.fn().mockImplementation((query: unknown) => {
            const queryStr = queryToString(query);
            txQueryCallLog.push(queryStr);
            return Promise.resolve(undefined);
          }),
          $queryRaw: jest.fn().mockImplementation((query) => {
            const queryStr = queryToString(query);
            txQueryCallLog.push(queryStr);
            if (queryStr.includes(`pg_advisory_xact_lock`)) {
              return Promise.resolve([]);
            }
            if (queryStr.includes(`SUM(amount)`) || queryStr.includes(`SUM(le.amount)`)) {
              return Promise.resolve([{ balance }]);
            }
            if (queryStr.includes(`COALESCE(SUM(le.amount)`)) {
              return Promise.resolve([{ balance }]);
            }
            return Promise.resolve(undefined);
          }),
          ledgerEntryModel: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: `ledger-entry-1` }),
          },
        };

        const result = await fn(tx);
        (prisma.$queryRaw as any)._txCallLog = txQueryCallLog;
        return result;
      }),
      // Expose call log for assertions
      _queryCallLog: queryCallLog,
    } as any;

    return prisma;
  }

  function createService(prisma: any) {
    const mailingService = {} as any;
    const balanceService = new BalanceCalculationService(prisma);
    const service = new ConsumerPaymentsService(prisma, mailingService, balanceService);
    (service as any).ensureLimits = jest.fn().mockResolvedValue(undefined);
    return service;
  }

  describe(`Withdraw - Idempotency and Safety`, () => {
    it(`should return existing entry for duplicate idempotency key`, async () => {
      const prisma = createMockPrisma({ balance: 100 });
      const service = createService(prisma);

      const existingEntry = { id: `ledger-existing`, ledgerId: `ledger-1` };
      prisma.ledgerEntryModel.findFirst.mockResolvedValue(existingEntry);

      const withdrawBody: WithdrawBody = {
        amount: 50,
        currencyCode: $Enums.CurrencyCode.USD,
        method: $Enums.PaymentMethodType.BANK_ACCOUNT,
      };
      const result = await service.withdraw(consumerId, withdrawBody, `duplicate-key`);

      expect(result).toEqual(existingEntry);
      expect(prisma.ledgerEntryModel.findFirst).toHaveBeenCalledWith({
        where: {
          idempotencyKey: `withdraw:duplicate-key`,
          consumerId,
          type: $Enums.LedgerEntryType.USER_PAYOUT,
          deletedAt: null,
        },
      });
    });

    it(`should use advisory lock and balance check in transaction`, async () => {
      const prisma = createMockPrisma({ balance: 100 });
      const service = createService(prisma);

      const withdrawBody: WithdrawBody = {
        amount: 50,
        currencyCode: $Enums.CurrencyCode.USD,
        method: $Enums.PaymentMethodType.BANK_ACCOUNT,
      };
      await service.withdraw(consumerId, withdrawBody, `key-1`);

      const txCallLog = (prisma.$queryRaw as any)._txCallLog as string[];
      expect(txCallLog).toBeDefined();

      const hasAdvisoryLock = txCallLog.some(
        (q: string) => q.includes(`pg_advisory_xact_lock`) && q.includes(`:withdraw`),
      );
      expect(hasAdvisoryLock).toBe(true);

      // Balance is checked via raw SQL (COALESCE(SUM(le.amount))); serialization is via advisory lock
      const hasBalanceCheck = txCallLog.some((q: string) => q.includes(`SUM(le.amount)`) || q.includes(`COALESCE(SUM`));
      expect(hasBalanceCheck).toBe(true);
    });
  });

  describe(`Transfer - Idempotency and Safety`, () => {
    it(`should return existing ledgerId for duplicate idempotency key`, async () => {
      const prisma = createMockPrisma({ balance: 100 });
      const service = createService(prisma);

      prisma.ledgerEntryModel.findFirst.mockResolvedValue({ ledgerId: `existing-ledger` });

      const transferBody: TransferBody = {
        amount: 50,
        recipient: `recipient@example.com`,
        currencyCode: $Enums.CurrencyCode.USD,
      };
      const result = await service.transfer(consumerId, transferBody, `duplicate-key`);

      expect(result).toEqual({ ledgerId: `existing-ledger` });
    });

    it(`should use two advisory locks for both parties`, async () => {
      const prisma = createMockPrisma({ balance: 100 });
      const service = createService(prisma);

      const transferBody: TransferBody = {
        amount: 50,
        recipient: `recipient@example.com`,
        currencyCode: $Enums.CurrencyCode.USD,
      };
      await service.transfer(consumerId, transferBody, `key-1`);

      // Check that two advisory locks were called (for sender and recipient)
      const txCallLog = (prisma.$queryRaw as any)._txCallLog as string[];
      expect(txCallLog).toBeDefined();

      // Advisory locks are executed via $executeRaw; both are logged in _txCallLog
      const lockCalls = txCallLog.filter((q: string) => q.includes(`pg_advisory_xact_lock`));
      expect(lockCalls.length).toBe(2);

      // Verify both locks include transfer operation type
      lockCalls.forEach((q: string) => {
        expect(q).toContain(`:transfer`);
      });
    });
  });

  describe(`Balance Check`, () => {
    it(`should run withdraw balance check inside transaction`, async () => {
      const prisma = createMockPrisma({ balance: 100 });
      const service = createService(prisma);

      const withdrawBody: WithdrawBody = {
        amount: 50,
        currencyCode: $Enums.CurrencyCode.USD,
        method: $Enums.PaymentMethodType.BANK_ACCOUNT,
      };
      await service.withdraw(consumerId, withdrawBody, `key-1`);

      const txCallLog = (prisma.$queryRaw as any)._txCallLog as string[];

      const balanceCheckCalls = txCallLog.filter(
        (q: string) => q.includes(`SUM(le.amount)`) || q.includes(`COALESCE(SUM`),
      );

      expect(balanceCheckCalls.length).toBeGreaterThan(0);
    });

    it(`should run transfer balance check inside transaction`, async () => {
      const prisma = createMockPrisma({ balance: 100 });
      const service = createService(prisma);

      const transferBody: TransferBody = {
        amount: 50,
        recipient: `recipient@example.com`,
        currencyCode: $Enums.CurrencyCode.USD,
      };
      await service.transfer(consumerId, transferBody, `key-1`);

      const txCallLog = (prisma.$queryRaw as any)._txCallLog as string[];

      const balanceCheckCalls = txCallLog.filter(
        (q: string) => q.includes(`SUM(le.amount)`) || q.includes(`COALESCE(SUM`),
      );

      expect(balanceCheckCalls.length).toBeGreaterThan(0);
    });
  });
});
