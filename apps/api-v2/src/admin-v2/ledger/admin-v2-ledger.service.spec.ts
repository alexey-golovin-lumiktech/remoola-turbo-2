import { $Enums, Prisma } from '@remoola/database-2';

import { encodeAdminV2Cursor } from '../admin-v2-cursor';
import { AdminV2LedgerService } from './admin-v2-ledger.service';

describe(`AdminV2LedgerService`, () => {
  it(`uses latest outcome semantics on ledger case instead of earliest outcome`, async () => {
    const service = new AdminV2LedgerService({
      ledgerEntryModel: {
        findUnique: jest.fn(async () => ({
          id: `ledger-1`,
          ledgerId: `ledger-group-1`,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.PENDING,
          amount: new Prisma.Decimal(`48.00`),
          feesType: null,
          feesAmount: null,
          stripeId: `pi_123`,
          idempotencyKey: `idem-1`,
          metadata: null,
          consumerId: `consumer-1`,
          paymentRequestId: `payment-1`,
          createdAt: new Date(`2026-04-13T00:00:00.000Z`),
          updatedAt: new Date(`2026-04-13T01:00:00.000Z`),
          consumer: { email: `consumer@example.com` },
          paymentRequest: {
            id: `payment-1`,
            status: $Enums.TransactionStatus.PENDING,
            paymentRail: $Enums.PaymentRail.CARD,
            payerId: `consumer-1`,
            requesterId: `consumer-2`,
            amount: new Prisma.Decimal(`48.00`),
            currencyCode: $Enums.CurrencyCode.USD,
            payer: { email: `payer@example.com` },
            requester: { email: `requester@example.com` },
          },
          outcomes: [
            {
              id: `outcome-latest`,
              status: $Enums.TransactionStatus.COMPLETED,
              source: `stripe`,
              externalId: `pi_123`,
              createdAt: new Date(`2026-04-13T03:00:00.000Z`),
            },
            {
              id: `outcome-earliest`,
              status: $Enums.TransactionStatus.WAITING,
              source: `stripe`,
              externalId: `pi_122`,
              createdAt: new Date(`2026-04-13T02:00:00.000Z`),
            },
          ],
          disputes: [],
        })),
        findMany: jest.fn(async () => [
          {
            id: `ledger-1`,
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            amount: new Prisma.Decimal(`48.00`),
            currencyCode: $Enums.CurrencyCode.USD,
            status: $Enums.TransactionStatus.PENDING,
            createdAt: new Date(`2026-04-13T00:00:00.000Z`),
            outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
          },
        ]),
      },
      adminActionAuditLogModel: {
        findMany: jest.fn(async () => []),
      },
      $queryRaw: jest.fn(async () => []),
    } as never);

    const ledgerCase = await service.getLedgerEntryCase(`ledger-1`);

    expect(ledgerCase.core.persistedStatus).toBe(`PENDING`);
    expect(ledgerCase.core.effectiveStatus).toBe(`COMPLETED`);
    expect(ledgerCase.staleWarning).toBe(true);
    expect(ledgerCase.outcomes.map((item) => item.id)).toEqual([`outcome-latest`, `outcome-earliest`]);
  });

  it(`applies amount-sign and createdAt filters on ledger explorer`, async () => {
    const findMany = jest.fn(async () => []);
    const service = new AdminV2LedgerService({
      ledgerEntryModel: {
        findMany,
      },
    } as never);

    const dateFrom = new Date(`2026-04-01T00:00:00.000Z`);
    const dateTo = new Date(`2026-04-30T23:59:59.999Z`);

    await service.listLedgerEntries({
      amountSign: `negative`,
      dateFrom,
      dateTo,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
          amount: {
            lt: 0,
          },
        }),
      }),
    );
  });

  it(`maps canonical disputeStatus metadata for standalone disputes surface`, async () => {
    const service = new AdminV2LedgerService({
      ledgerEntryDisputeModel: {
        findMany: jest.fn(async () => [
          {
            id: `dispute-row-1`,
            stripeDisputeId: `dp_fixture_open`,
            metadata: { disputeStatus: `open`, reason: `fraudulent`, amount: 4800 },
            createdAt: new Date(`2026-04-13T00:00:00.000Z`),
            ledgerEntry: {
              id: `ledger-1`,
              ledgerId: `ledger-group-1`,
              paymentRequestId: `payment-1`,
              consumerId: `consumer-1`,
              type: $Enums.LedgerEntryType.USER_PAYMENT,
              amount: new Prisma.Decimal(`48.00`),
              currencyCode: $Enums.CurrencyCode.USD,
              paymentRequest: {
                paymentRail: $Enums.PaymentRail.CARD,
              },
            },
          },
        ]),
      },
    } as never);

    const disputes = await service.listDisputes();

    expect(disputes.items).toEqual([
      expect.objectContaining({
        id: `dispute-row-1`,
        stripeDisputeId: `dp_fixture_open`,
        disputeStatus: `open`,
        reason: `fraudulent`,
        metadata: {
          disputeStatus: `open`,
          reason: `fraudulent`,
          amount: 4800,
        },
      }),
    ]);
  });

  it(`applies inclusive createdAt date filters on standalone disputes without changing cursor pagination`, async () => {
    const findMany = jest.fn(async () => []);
    const service = new AdminV2LedgerService({
      ledgerEntryDisputeModel: {
        findMany,
      },
    } as never);

    const dateFrom = new Date(`2026-04-01T00:00:00.000Z`);
    const dateTo = new Date(`2026-04-30T23:59:59.999Z`);

    await service.listDisputes({
      cursor: encodeAdminV2Cursor({ createdAt: new Date(`2026-04-15T12:00:00.000Z`), id: `dispute-row-9` }),
      limit: 10,
      consumerId: `consumer-1`,
      q: `dp_fixture_open`,
      dateFrom,
      dateTo,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              createdAt: {
                gte: dateFrom,
                lte: dateTo,
              },
            },
            {
              OR: [
                { createdAt: { lt: new Date(`2026-04-15T12:00:00.000Z`) } },
                {
                  AND: [{ createdAt: new Date(`2026-04-15T12:00:00.000Z`) }, { id: { lt: `dispute-row-9` } }],
                },
              ],
            },
            {
              OR: [{ stripeDisputeId: { contains: `dp_fixture_open`, mode: `insensitive` } }],
            },
            {
              ledgerEntry: {
                consumerId: `consumer-1`,
              },
            },
          ],
        },
        orderBy: [{ createdAt: `desc` }, { id: `desc` }],
        take: 11,
      }),
    );
  });
});
