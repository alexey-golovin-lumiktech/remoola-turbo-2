import { $Enums } from '@remoola/database-2';

import { BalanceCalculationMode, BalanceCalculationService } from './balance-calculation.service';

describe(`BalanceCalculationService`, () => {
  const consumerId = `consumer-1`;

  describe(`COMPLETED_AND_PENDING mode (Ledger B1 regression)`, () => {
    it(`returns non-zero balance when query returns rows (uses IN not = 'COMPLETED,PENDING')`, async () => {
      const prisma = {
        $executeRaw: jest.fn().mockResolvedValue(undefined),
        $queryRaw: jest.fn().mockResolvedValue([{ currency_code: $Enums.CurrencyCode.USD, sum_amount: `100` }]),
      } as any;

      const service = new BalanceCalculationService(prisma);
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

      const service = new BalanceCalculationService(prisma);
      const result = await service.calculateSingle(consumerId, $Enums.CurrencyCode.USD, {
        mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
      });

      expect(result.balance).toBe(50);
      expect(result.mode).toBe(BalanceCalculationMode.COMPLETED_AND_PENDING);
    });
  });

  describe(`COMPLETED mode`, () => {
    it(`calculateMultiCurrency returns balances from query`, async () => {
      const prisma = {
        $executeRaw: jest.fn().mockResolvedValue(undefined),
        $queryRaw: jest.fn().mockResolvedValue([{ currency_code: $Enums.CurrencyCode.USD, sum_amount: `200` }]),
      } as any;

      const service = new BalanceCalculationService(prisma);
      const result = await service.calculateMultiCurrency(consumerId);

      expect(result.balances.USD).toBe(200);
      expect(result.mode).toBe(BalanceCalculationMode.COMPLETED);
    });
  });
});
