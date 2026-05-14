import { type Prisma } from '@remoola/database-2';

import { AdminV2LedgerAnomaliesQuery } from './admin-v2-ledger-anomalies.query';

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

describe(`AdminV2LedgerAnomaliesQuery`, () => {
  function makeQuery() {
    const queryRaw = jest.fn<Promise<unknown[]>, [Prisma.Sql]>(async () => [{ count: 0 }]);
    const prisma = {
      $queryRaw: queryRaw,
    };

    return {
      prisma,
      query: new AdminV2LedgerAnomaliesQuery(prisma as never),
    };
  }

  it(`loads summary counts through raw SQL entrypoints`, async () => {
    const { prisma, query } = makeQuery();
    prisma.$queryRaw.mockResolvedValueOnce([{ count: 4 }]);

    const result = await query.countStalePendingEntries(new Date(`2026-04-10T00:00:00.000Z`));

    expect(result).toBe(4);
    const sql = queryToString(prisma.$queryRaw.mock.calls[0][0]);
    expect(sql).toContain(`SELECT COUNT(*)::int AS "count"`);
    expect(sql).toContain(`FROM ledger_entry le`);
    expect(sql).toContain(`latest.status::text IN`);
  });

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

  it(`uses limit plus one and omits cursor SQL on the first page`, async () => {
    const { prisma, query } = makeQuery();
    prisma.$queryRaw.mockResolvedValueOnce([]);

    await query.listStalePendingEntries(
      {
        dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
        dateTo: new Date(`2026-04-20T00:00:00.000Z`),
        limit: 25,
        cursor: null,
      },
      new Date(`2026-04-20T00:00:00.000Z`),
    );

    const sql = queryToString(prisma.$queryRaw.mock.calls[0][0]);
    expect(sql).toContain(`ORDER BY latest.created_at DESC, le.id DESC`);
    expect(sql).toContain(`LIMIT ?`);
    expect(sql).not.toContain(`le.id <`);
  });

  it(`adds cursor SQL when fetching the next page`, async () => {
    const { prisma, query } = makeQuery();
    prisma.$queryRaw.mockResolvedValueOnce([]);

    await query.listDuplicateIdempotencyRisk({
      dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
      dateTo: new Date(`2026-04-20T00:00:00.000Z`),
      limit: 10,
      cursor: {
        createdAt: new Date(`2026-04-05T10:00:00.000Z`),
        id: `entry-2`,
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
