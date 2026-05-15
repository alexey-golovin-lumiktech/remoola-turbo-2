import { type Prisma, $Enums } from '@remoola/database-2';

import { BalanceCalculationRepository } from './balance-calculation.repository';
import { BalanceCalculationMode, BalanceCalculationService } from './balance-calculation.service';

describe(`BalanceCalculationService`, () => {
  const consumerId = `11111111-1111-4111-8111-111111111111`;
  const renderSql = (query: Prisma.Sql) => query.sql;
  const buildService = (prisma: any) => new BalanceCalculationService(new BalanceCalculationRepository(prisma));

  describe(`COMPLETED_AND_PENDING mode (Ledger B1 regression)`, () => {
    it(`returns non-zero balance when query returns rows (uses IN not = 'COMPLETED,PENDING')`, async () => {
      const prisma = {
        $executeRaw: jest.fn().mockResolvedValue(undefined),
        $queryRaw: jest.fn().mockResolvedValue([{ currency_code: $Enums.CurrencyCode.USD, sum_amount: `100` }]),
      } as any;

      const service = buildService(prisma);
      const result = await service.calculateMultiCurrency(consumerId, {
        mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
      });

      expect(result.balances.USD).toBe(100);
      expect(result.mode).toBe(BalanceCalculationMode.COMPLETED_AND_PENDING);
    });

    it(`calculateSingle with COMPLETED_AND_PENDING returns stubbed balance`, async () => {
      const prisma = {
        $executeRaw: jest.fn().mockResolvedValue(undefined),
        $queryRaw: jest.fn().mockResolvedValue([{ currency_code: $Enums.CurrencyCode.USD, balance: `50` }]),
      } as any;

      const service = buildService(prisma);
      const result = await service.calculateSingle(consumerId, $Enums.CurrencyCode.USD, {
        mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
      });

      expect(result.balance).toBe(50);
      expect(result.mode).toBe(BalanceCalculationMode.COMPLETED_AND_PENDING);
    });

    it(`excludes pending user deposit credits from available wallet balance`, async () => {
      const prisma = {
        $executeRaw: jest.fn().mockResolvedValue(undefined),
        $queryRaw: jest.fn().mockResolvedValue([{ currency_code: $Enums.CurrencyCode.USD, sum_amount: `0` }]),
      } as any;

      const service = buildService(prisma);
      await service.calculateMultiCurrency(consumerId, {
        mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
      });

      const query = prisma.$queryRaw.mock.calls[0][0] as Prisma.Sql;
      const sql = renderSql(query);
      const values = query.values;

      expect(sql).toContain(`COALESCE(latest.status, le.status)::text <>`);
      expect(values).toContain($Enums.LedgerEntryType.USER_DEPOSIT);
      expect(values).toContain($Enums.TransactionStatus.COMPLETED);
    });

    it(`excludes pending card-funded requester credits even when the settlement row stays USER_PAYMENT`, async () => {
      const prisma = {
        $executeRaw: jest.fn().mockResolvedValue(undefined),
        $queryRaw: jest.fn().mockResolvedValue([{ currency_code: $Enums.CurrencyCode.USD, sum_amount: `0` }]),
      } as any;

      const service = buildService(prisma);
      await service.calculateMultiCurrency(consumerId, {
        mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
      });

      const query = prisma.$queryRaw.mock.calls[0][0] as Prisma.Sql;
      const sql = renderSql(query);
      const values = query.values;

      expect(sql).toContain(`le.amount > 0`);
      expect(values).toContain($Enums.LedgerEntryType.USER_PAYMENT);
      expect(values).toContain($Enums.PaymentRail.CARD);
      expect(values).toContain($Enums.TransactionStatus.COMPLETED);
    });
  });

  describe(`COMPLETED mode`, () => {
    it(`calculateMultiCurrency returns balances from query`, async () => {
      const prisma = {
        $executeRaw: jest.fn().mockResolvedValue(undefined),
        $queryRaw: jest.fn().mockResolvedValue([{ currency_code: $Enums.CurrencyCode.USD, sum_amount: `200` }]),
      } as any;

      const service = buildService(prisma);
      const result = await service.calculateMultiCurrency(consumerId);

      expect(result.balances.USD).toBe(200);
      expect(result.mode).toBe(BalanceCalculationMode.COMPLETED);
    });

    it(`rejects invalid raw balance rows`, async () => {
      const prisma = {
        $executeRaw: jest.fn().mockResolvedValue(undefined),
        $queryRaw: jest.fn().mockResolvedValue([{ currency_code: `DOGE`, sum_amount: `10` }]),
      } as any;

      const service = buildService(prisma);
      await expect(service.calculateMultiCurrency(consumerId)).rejects.toThrow(
        `balance row currency_code must be a known currency`,
      );
    });

    it(`rejects invalid raw balance amounts`, async () => {
      const prisma = {
        $executeRaw: jest.fn().mockResolvedValue(undefined),
        $queryRaw: jest.fn().mockResolvedValue([{ currency_code: $Enums.CurrencyCode.USD, balance: `not-a-number` }]),
      } as any;

      const service = buildService(prisma);
      await expect(service.calculateSingle(consumerId, $Enums.CurrencyCode.USD)).rejects.toThrow(
        `balance must be a finite number`,
      );
    });

    it(`excludes external card payer legs from wallet balances`, async () => {
      const prisma = {
        $executeRaw: jest.fn().mockResolvedValue(undefined),
        $queryRaw: jest.fn().mockResolvedValue([{ currency_code: $Enums.CurrencyCode.EUR, sum_amount: `0` }]),
      } as any;

      const service = buildService(prisma);
      await service.calculateMultiCurrency(consumerId);

      const query = prisma.$queryRaw.mock.calls[0][0] as Prisma.Sql;
      const sql = renderSql(query);
      const values = query.values;

      expect(sql).toContain(`LEFT JOIN payment_request pr ON pr.id = le.payment_request_id`);
      expect(sql).toContain(`pr.payment_rail::text`);
      expect(values).toContain($Enums.LedgerEntryType.USER_PAYMENT);
      expect(values).toContain($Enums.LedgerEntryType.USER_PAYMENT_REVERSAL);
      expect(values).toContain($Enums.PaymentRail.CARD);
      expect(values).toContain($Enums.PaymentRail.STRIPE_REFUND);
      expect(values).toContain($Enums.PaymentRail.STRIPE_CHARGEBACK);
    });

    it(`applies the same wallet eligibility rule inside transaction balance checks`, async () => {
      const tx = {
        $executeRaw: jest.fn().mockResolvedValue(undefined),
        $queryRaw: jest.fn().mockResolvedValue([{ balance: `0` }]),
      } as any;

      const service = buildService({} as any);
      await service.calculateInTransaction(tx, consumerId, $Enums.CurrencyCode.EUR);

      const query = tx.$queryRaw.mock.calls[0][0] as Prisma.Sql;
      const sql = renderSql(query);
      const values = query.values;

      expect(sql).toContain(`LEFT JOIN payment_request pr ON pr.id = le.payment_request_id`);
      expect(sql).toContain(`pr.payment_rail::text`);
      expect(values).toContain($Enums.LedgerEntryType.USER_PAYMENT);
      expect(values).toContain($Enums.LedgerEntryType.USER_PAYMENT_REVERSAL);
    });
  });
});
