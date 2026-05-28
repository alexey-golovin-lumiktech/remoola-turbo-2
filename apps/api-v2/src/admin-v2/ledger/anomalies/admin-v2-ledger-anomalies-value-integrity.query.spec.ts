import { describe, expect, it, jest } from '@jest/globals';

import { type Prisma } from '@remoola/database-2';

import { AdminV2LedgerAnomaliesValueIntegrityQuery } from './admin-v2-ledger-anomalies-value-integrity.query';

function queryToString(query: unknown): string {
  if (typeof query === `string`) {
    return query;
  }
  if (
    query &&
    typeof query === `object` &&
    `strings` in query &&
    Array.isArray((query as { strings: string[] }).strings)
  ) {
    return (query as { strings: string[] }).strings.join(`?`);
  }
  return String(query);
}

describe(`AdminV2LedgerAnomaliesValueIntegrityQuery`, () => {
  function makeQuery() {
    const prisma = {
      $queryRaw: jest.fn<(sql: Prisma.Sql) => Promise<unknown[]>>(async () => [{ count: 0 }]),
    };

    return {
      prisma,
      query: new AdminV2LedgerAnomaliesValueIntegrityQuery(prisma as never),
    };
  }

  it(`loads range counts for large value outliers`, async () => {
    const { prisma, query } = makeQuery();
    prisma.$queryRaw.mockResolvedValueOnce([{ count: 2 }]);

    const result = await query.countLargeValueOutliersForRange(
      new Date(`2026-04-01T00:00:00.000Z`),
      new Date(`2026-04-20T00:00:00.000Z`),
    );

    expect(result).toBe(2);
    const sql = queryToString(prisma.$queryRaw.mock.calls[0][0]);
    expect(sql).toContain(`ABS(le.amount) >= thresholds.threshold`);
    expect(sql).toContain(`threshold_map(currency_code, threshold)`);
  });

  it(`loads summary counts for orphaned entries through integrity SQL`, async () => {
    const { prisma, query } = makeQuery();
    prisma.$queryRaw.mockResolvedValueOnce([{ count: 5 }]);

    const result = await query.countOrphanedEntries(new Date(`2026-04-20T00:00:00.000Z`));

    expect(result).toBe(5);
    const sql = queryToString(prisma.$queryRaw.mock.calls[0][0]);
    expect(sql).toContain(`NOT EXISTS (`);
    expect(sql).toContain(`FROM ledger_entry_outcome o`);
  });

  it(`adds cursor SQL when fetching duplicate-idempotency pages`, async () => {
    const { prisma, query } = makeQuery();
    prisma.$queryRaw.mockResolvedValueOnce([]);

    await query.listDuplicateIdempotencyRisk({
      dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
      dateTo: new Date(`2026-04-20T00:00:00.000Z`),
      limit: 10,
      cursor: {
        createdAt: new Date(`2026-04-05T10:00:00.000Z`),
        id: `550e8400-e29b-41d4-a716-446655440002`,
      },
    });

    const sql = queryToString(prisma.$queryRaw.mock.calls[0][0]);
    expect(sql).toContain(`AND (`);
    expect(sql).toContain(`le.id <`);
    expect(sql).toContain(`ORDER BY le.created_at DESC, le.id DESC`);
  });

  it(`loads impossible transition rows ordered by violation time`, async () => {
    const { prisma, query } = makeQuery();
    prisma.$queryRaw.mockResolvedValueOnce([]);

    await query.listImpossibleTransitions({
      dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
      dateTo: new Date(`2026-04-20T00:00:00.000Z`),
      limit: 5,
      cursor: null,
    });

    const sql = queryToString(prisma.$queryRaw.mock.calls[0][0]);
    expect(sql).toContain(`violation.violation_at`);
    expect(sql).toContain(`LAG(o.status) OVER`);
    expect(sql).toContain(`ORDER BY violation.violation_at DESC, le.id DESC`);
  });
});
