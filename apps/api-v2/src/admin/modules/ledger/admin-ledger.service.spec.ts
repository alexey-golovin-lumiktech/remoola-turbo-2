import { $Enums } from '@remoola/database-2';

import { AdminLedgersService } from './admin-ledger.service';

describe(`AdminLedgersService`, () => {
  it(`maps ledger rows to effective status and derives rail from payment request when metadata is empty`, async () => {
    const prisma = {
      ledgerEntryModel: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: `entry-1`,
            ledgerId: `ledger-1`,
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            currencyCode: $Enums.CurrencyCode.USD,
            status: $Enums.TransactionStatus.PENDING,
            amount: `-10.00`,
            feesType: null,
            feesAmount: null,
            stripeId: null,
            idempotencyKey: `idem-1`,
            metadata: {},
            consumerId: `consumer-1`,
            paymentRequestId: `pr-1`,
            createdAt: new Date(`2026-03-25T18:00:00.000Z`),
            updatedAt: new Date(`2026-03-25T18:00:00.000Z`),
            paymentRequest: { paymentRail: $Enums.PaymentRail.CARD },
            outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
          },
        ]),
      },
    } as any;

    const service = new AdminLedgersService(prisma);
    const result = await service.findAll({ page: 1, pageSize: 10 });

    expect(result.total).toBe(1);
    expect(result.items[0]?.status).toBe($Enums.TransactionStatus.COMPLETED);
    expect(result.items[0]?.rail).toBe($Enums.PaymentRail.CARD);
    expect(prisma.ledgerEntryModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          paymentRequest: { select: { paymentRail: true } },
          outcomes: expect.objectContaining({
            take: 1,
            select: { status: true },
          }),
        }),
      }),
    );
  });

  it(`filters by effective status instead of raw ledger status`, async () => {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce([{ id: `entry-2` }]),
      ledgerEntryModel: {
        count: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          {
            id: `entry-2`,
            ledgerId: `ledger-2`,
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            currencyCode: $Enums.CurrencyCode.USD,
            status: $Enums.TransactionStatus.PENDING,
            amount: `-20.00`,
            feesType: null,
            feesAmount: null,
            stripeId: null,
            idempotencyKey: `idem-2`,
            metadata: { rail: $Enums.PaymentRail.CARD },
            consumerId: `consumer-2`,
            paymentRequestId: `pr-2`,
            createdAt: new Date(`2026-03-25T18:05:00.000Z`),
            updatedAt: new Date(`2026-03-25T18:05:00.000Z`),
            paymentRequest: { paymentRail: null },
            outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
          },
        ]),
      },
    } as any;

    const service = new AdminLedgersService(prisma);
    const result = await service.findAll({
      page: 1,
      pageSize: 10,
      status: $Enums.TransactionStatus.COMPLETED,
    });

    expect(prisma.ledgerEntryModel.count).not.toHaveBeenCalled();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(prisma.ledgerEntryModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: [`entry-2`] } },
      }),
    );
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe(`entry-2`);
    expect(result.items[0]?.status).toBe($Enums.TransactionStatus.COMPLETED);
  });

  it(`uses db-backed totals and ids for effective-status pagination beyond 2000 rows`, async () => {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ total: 2405 }])
        .mockResolvedValueOnce([{ id: `entry-2405` }]),
      ledgerEntryModel: {
        count: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          {
            id: `entry-2405`,
            ledgerId: `ledger-2405`,
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            currencyCode: $Enums.CurrencyCode.USD,
            status: $Enums.TransactionStatus.PENDING,
            amount: `-40.00`,
            feesType: null,
            feesAmount: null,
            stripeId: null,
            idempotencyKey: `idem-2405`,
            metadata: {},
            consumerId: `consumer-2405`,
            paymentRequestId: `pr-2405`,
            createdAt: new Date(`2026-03-25T18:07:00.000Z`),
            updatedAt: new Date(`2026-03-25T18:07:00.000Z`),
            paymentRequest: { paymentRail: $Enums.PaymentRail.CARD },
            outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
          },
        ]),
      },
    } as any;

    const service = new AdminLedgersService(prisma);
    const result = await service.findAll({
      page: 121,
      pageSize: 20,
      status: $Enums.TransactionStatus.COMPLETED,
    });

    expect(result.total).toBe(2405);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe(`entry-2405`);
    expect(result.items[0]?.status).toBe($Enums.TransactionStatus.COMPLETED);
    expect(prisma.ledgerEntryModel.count).not.toHaveBeenCalled();
    expect(prisma.ledgerEntryModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: [`entry-2405`] } },
      }),
    );
  });
});
