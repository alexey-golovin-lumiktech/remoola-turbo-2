import { $Enums, Prisma } from '@remoola/database-2';

import { AdminDashboardService } from './admin-dashboard.service';

describe(`AdminDashboardService`, () => {
  it(`maps recent payment requests to effective status from latest user payment outcome`, async () => {
    const prisma = {
      paymentRequestModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `pr-1`,
            status: $Enums.TransactionStatus.PENDING,
            amount: new Prisma.Decimal(12),
            currencyCode: $Enums.CurrencyCode.USD,
            description: `Invoice`,
            payerId: `payer-1`,
            requesterId: `requester-1`,
            requesterEmail: `requester@example.com`,
            payerEmail: `payer@example.com`,
            createdAt: new Date(`2026-03-25T18:00:00.000Z`),
            updatedAt: new Date(`2026-03-25T18:00:00.000Z`),
            paymentRail: $Enums.PaymentRail.CARD,
            payer: { id: `payer-1`, email: `payer@example.com` },
            requester: { id: `requester-1`, email: `requester@example.com` },
            ledgerEntries: [
              {
                status: $Enums.TransactionStatus.PENDING,
                createdAt: new Date(`2026-03-25T18:01:00.000Z`),
                outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
              },
            ],
          },
        ]),
      },
    } as any;

    const service = new AdminDashboardService(prisma);
    const result = await service.getRecentPaymentRequests();

    expect(result[0]?.status).toBe($Enums.TransactionStatus.COMPLETED);
  });

  it(`builds payment request status totals from effective ledger status summary query`, async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          status: $Enums.TransactionStatus.COMPLETED,
          count: BigInt(3),
          totalAmount: new Prisma.Decimal(125.5),
        },
      ]),
    } as any;

    const service = new AdminDashboardService(prisma);
    const result = await service.getPaymentRequestsByStatus();

    expect(result).toEqual([
      {
        status: $Enums.TransactionStatus.COMPLETED,
        count: 3,
        totalAmount: `125.5`,
      },
    ]);

    const query = prisma.$queryRaw.mock.calls[0][0] as Prisma.Sql;
    expect(query.values).toContain($Enums.LedgerEntryType.USER_PAYMENT);
    expect(query.values).toContain($Enums.LedgerEntryType.USER_DEPOSIT);
  });

  it(`uses effective status totals inside dashboard stats`, async () => {
    const prisma = {
      consumerModel: {
        count: jest.fn().mockResolvedValueOnce(12).mockResolvedValueOnce(5),
      },
      paymentRequestModel: {
        count: jest.fn().mockResolvedValue(8),
      },
      ledgerEntryModel: {
        count: jest.fn().mockResolvedValue(21),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $queryRaw: jest.fn().mockResolvedValueOnce([
        {
          status: $Enums.TransactionStatus.WAITING,
          count: BigInt(2),
          totalAmount: new Prisma.Decimal(40),
        },
      ]),
    } as any;

    const service = new AdminDashboardService(prisma);
    jest.spyOn(service, `getLedgerAnomalies`).mockResolvedValue([]);
    const result = await service.getStats();

    expect(result.paymentRequests.byStatus).toEqual({
      WAITING: 2,
    });
  });

  it(`does not flag external-funding deposit shape as amount mismatch`, async () => {
    const prisma = {
      ledgerEntryModel: {
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
      },
      paymentRequestModel: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            {
              id: `pr-deposit`,
              amount: new Prisma.Decimal(25),
              requesterId: `requester-1`,
              payerId: `payer-1`,
              createdAt: new Date(`2026-03-25T18:05:00.000Z`),
              ledgerEntries: [
                {
                  type: $Enums.LedgerEntryType.USER_DEPOSIT,
                  amount: new Prisma.Decimal(25),
                },
              ],
            },
          ]),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    } as any;

    const service = new AdminDashboardService(prisma);
    const anomalies = await service.getLedgerAnomalies();

    expect(anomalies).toEqual([]);
  });

  it(`flags unlinked deposit reversal rows as payment ledger anomalies`, async () => {
    const prisma = {
      ledgerEntryModel: {
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            {
              id: `entry-unlinked`,
              consumerId: `consumer-1`,
              createdAt: new Date(`2026-03-26T12:00:00.000Z`),
            },
          ]),
      },
      paymentRequestModel: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    } as any;

    const service = new AdminDashboardService(prisma);
    const anomalies = await service.getLedgerAnomalies();

    expect(prisma.ledgerEntryModel.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          paymentRequestId: null,
          type: {
            in: [
              $Enums.LedgerEntryType.USER_PAYMENT,
              $Enums.LedgerEntryType.USER_DEPOSIT,
              $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
              $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL,
            ],
          },
        },
      }),
    );
    expect(anomalies).toEqual([
      expect.objectContaining({
        id: `unlinked:entry-unlinked`,
        type: `unlinked_payment_ledger_entry`,
      }),
    ]);
  });
});
