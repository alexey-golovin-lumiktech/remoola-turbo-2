import { describe, expect, it, jest } from '@jest/globals';

import { $Enums, Prisma } from '@remoola/database-2';

import { AdminV2LedgerQuery } from './admin-v2-ledger.query';

const LEDGER_ENTRY_ID = `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`;

function buildLedgerListRow(id: string = LEDGER_ENTRY_ID) {
  return {
    id,
    ledgerId: `ledger-group-1`,
    type: $Enums.LedgerEntryType.USER_PAYMENT,
    currencyCode: $Enums.CurrencyCode.USD,
    status: $Enums.TransactionStatus.PENDING,
    amount: new Prisma.Decimal(`48.00`),
    feesType: null,
    feesAmount: null,
    stripeId: null,
    idempotencyKey: null,
    metadata: null,
    consumerId: `consumer-1`,
    paymentRequestId: null,
    createdAt: new Date(`2026-04-13T00:00:00.000Z`),
    updatedAt: new Date(`2026-04-13T01:00:00.000Z`),
    consumer: { email: `consumer@example.com` },
    paymentRequest: null,
    outcomes: [],
    disputes: [],
  };
}

function buildLedgerCaseEntry(id: string = LEDGER_ENTRY_ID) {
  return {
    ...buildLedgerListRow(id),
    paymentRequest: null,
    outcomes: [],
    disputes: [],
  };
}

function buildQuery() {
  const prisma = {
    $queryRaw: jest.fn<(...a: any[]) => any>(),
    ledgerEntryModel: {
      findMany: jest.fn<(...a: any[]) => any>(),
      findUnique: jest.fn<(...a: any[]) => any>(),
    },
    adminActionAuditLogModel: {
      findMany: jest.fn<(...a: any[]) => any>(),
    },
    ledgerEntryDisputeModel: {
      findMany: jest.fn<(...a: any[]) => any>(),
    },
  };

  return {
    query: new AdminV2LedgerQuery(prisma as never),
    prisma,
  };
}

describe(`AdminV2LedgerQuery`, () => {
  it(`applies amount-sign and createdAt filters on the default ledger explorer branch`, async () => {
    const { query, prisma } = buildQuery();
    prisma.ledgerEntryModel.findMany.mockResolvedValueOnce([]);

    const dateFrom = new Date(`2026-04-01T00:00:00.000Z`);
    const dateTo = new Date(`2026-04-30T23:59:59.999Z`);

    await query.listLedgerEntries({
      limit: 25,
      cursor: null,
      amountSign: `negative`,
      createdAt: {
        gte: dateFrom,
        lte: dateTo,
      },
    });

    expect(prisma.ledgerEntryModel.findMany).toHaveBeenCalledWith(
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
        orderBy: [{ createdAt: `desc` }, { id: `desc` }],
        take: 26,
      }),
    );
  });

  it(`treats invalid optional UUID filters as no-match predicates on the default branch`, async () => {
    const { query, prisma } = buildQuery();
    prisma.ledgerEntryModel.findMany.mockResolvedValueOnce([]);

    await query.listLedgerEntries({
      limit: 25,
      cursor: null,
      paymentRequestId: `not-a-uuid`,
    });

    expect(prisma.ledgerEntryModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: [] },
        }),
      }),
    );
  });

  it(`uses raw SQL page ids for explicit status filtering and reorders hydrated rows`, async () => {
    const { query, prisma } = buildQuery();
    const ledgerB = `11111111-1111-4111-8111-111111111111`;
    const ledgerA = `22222222-2222-4222-8222-222222222222`;
    const ledgerNext = `33333333-3333-4333-8333-333333333333`;
    prisma.$queryRaw.mockResolvedValueOnce([
      { id: ledgerB, created_at: new Date(`2026-04-13T02:00:00.000Z`) },
      { id: ledgerA, created_at: new Date(`2026-04-13T01:00:00.000Z`) },
      { id: ledgerNext, created_at: new Date(`2026-04-13T00:00:00.000Z`) },
    ]);
    prisma.ledgerEntryModel.findMany.mockResolvedValueOnce([buildLedgerListRow(ledgerA), buildLedgerListRow(ledgerB)]);

    const result = await query.listLedgerEntries({
      limit: 2,
      cursor: null,
      status: $Enums.TransactionStatus.COMPLETED,
    });

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.ledgerEntryModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: [ledgerB, ledgerA] } },
      }),
    );
    expect(result.rows.map((row) => row.id)).toEqual([ledgerB, ledgerA]);
    expect(result.nextCursorSource).toEqual({
      createdAt: new Date(`2026-04-13T00:00:00.000Z`),
      id: ledgerNext,
    });
  });

  it(`rejects invalid raw SQL page id rows before hydrating ledger entries`, async () => {
    const { query, prisma } = buildQuery();
    prisma.$queryRaw.mockResolvedValueOnce([
      { id: `11111111-1111-4111-8111-111111111111`, created_at: `2026-04-13T02:00:00.000Z` },
    ]);

    await expect(
      query.listLedgerEntries({
        limit: 2,
        cursor: null,
        status: $Enums.TransactionStatus.COMPLETED,
      }),
    ).rejects.toThrow(`ledger raw page row created_at must be a valid Date`);
    expect(prisma.ledgerEntryModel.findMany).not.toHaveBeenCalled();
  });

  it(`rejects non-UUID raw SQL page ids before hydrating ledger entries`, async () => {
    const { query, prisma } = buildQuery();
    prisma.$queryRaw.mockResolvedValueOnce([{ id: `ledger-b`, created_at: new Date(`2026-04-13T02:00:00.000Z`) }]);

    await expect(
      query.listLedgerEntries({
        limit: 2,
        cursor: null,
        status: $Enums.TransactionStatus.COMPLETED,
      }),
    ).rejects.toThrow(`ledger raw page row id must be a valid UUID`);
    expect(prisma.ledgerEntryModel.findMany).not.toHaveBeenCalled();
  });

  it(`returns null when a ledger case entry does not exist`, async () => {
    const { query, prisma } = buildQuery();
    prisma.ledgerEntryModel.findUnique.mockResolvedValueOnce(null);

    await expect(query.getLedgerEntryCase(`missing-ledger`)).resolves.toBeNull();
  });

  it(`loads related entries and audit context for an existing ledger case`, async () => {
    const { query, prisma } = buildQuery();
    prisma.ledgerEntryModel.findUnique.mockResolvedValueOnce({
      ...buildLedgerCaseEntry(`ledger-1`),
      ledgerId: `ledger-group-1`,
      paymentRequestId: `payment-1`,
    });
    prisma.ledgerEntryModel.findMany.mockResolvedValueOnce([
      {
        id: `ledger-1`,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        amount: new Prisma.Decimal(`48.00`),
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.PENDING,
        createdAt: new Date(`2026-04-13T00:00:00.000Z`),
        outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
      },
    ]);
    prisma.adminActionAuditLogModel.findMany.mockResolvedValueOnce([
      {
        id: `audit-1`,
        action: `payment_refund`,
        resource: `payment_request`,
        resourceId: `payment-1`,
        createdAt: new Date(`2026-04-13T02:00:00.000Z`),
        admin: { email: `ops@example.com` },
      },
    ]);

    const result = await query.getLedgerEntryCase(`ledger-1`);

    expect(prisma.ledgerEntryModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ledgerId: `ledger-group-1`, deletedAt: null },
      }),
    );
    expect(prisma.adminActionAuditLogModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { resourceId: `payment-1` },
        take: 20,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        entry: expect.objectContaining({ id: `ledger-1` }),
        relatedEntries: expect.arrayContaining([expect.objectContaining({ id: `ledger-1` })]),
        auditContext: expect.arrayContaining([expect.objectContaining({ id: `audit-1` })]),
      }),
    );
  });

  it(`applies inclusive createdAt date filters on standalone disputes without changing cursor pagination`, async () => {
    const { query, prisma } = buildQuery();
    prisma.ledgerEntryDisputeModel.findMany.mockResolvedValueOnce([]);

    const dateFrom = new Date(`2026-04-01T00:00:00.000Z`);
    const dateTo = new Date(`2026-04-30T23:59:59.999Z`);

    await query.listDisputes({
      cursor: { createdAt: new Date(`2026-04-15T12:00:00.000Z`), id: `dispute-row-9` },
      limit: 10,
      consumerId: `consumer-1`,
      search: `dp_fixture_open`,
      createdAt: {
        gte: dateFrom,
        lte: dateTo,
      },
    });

    expect(prisma.ledgerEntryDisputeModel.findMany).toHaveBeenCalledWith(
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
