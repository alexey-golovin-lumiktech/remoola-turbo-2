import { type Prisma } from '@remoola/database-2';

import { AdminV2LedgerAnomaliesLatestOutcomeQuery } from './admin-v2-ledger-anomalies-latest-outcome.query';

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

describe(`AdminV2LedgerAnomaliesLatestOutcomeQuery`, () => {
  function makeQuery() {
    const prisma = {
      $queryRaw: jest.fn<Promise<unknown[]>, [Prisma.Sql]>(async () => [{ count: 0 }]),
    };

    return {
      prisma,
      query: new AdminV2LedgerAnomaliesLatestOutcomeQuery(prisma as never),
    };
  }

  it(`loads summary counts through latest-outcome SQL entrypoints`, async () => {
    const { prisma, query } = makeQuery();
    prisma.$queryRaw.mockResolvedValueOnce([{ count: 4 }]);

    const result = await query.countStalePendingEntries(new Date(`2026-04-10T00:00:00.000Z`));

    expect(result).toBe(4);
    const sql = queryToString(prisma.$queryRaw.mock.calls[0][0]);
    expect(sql).toContain(`SELECT COUNT(*)::int AS "count"`);
    expect(sql).toContain(`FROM ledger_entry le`);
    expect(sql).toContain(`latest.status::text IN`);
  });

  it(`loads range counts for inconsistent outcome chains`, async () => {
    const { prisma, query } = makeQuery();
    prisma.$queryRaw.mockResolvedValueOnce([{ count: 2 }]);

    const result = await query.countInconsistentOutcomeChainsForRange(
      new Date(`2026-04-01T00:00:00.000Z`),
      new Date(`2026-04-20T00:00:00.000Z`),
      new Date(`2026-04-20T00:00:00.000Z`),
    );

    expect(result).toBe(2);
    const sql = queryToString(prisma.$queryRaw.mock.calls[0][0]);
    expect(sql).toContain(`le.status <> latest.status`);
    expect(sql).toContain(`latest.created_at >= ?`);
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

  it(`adds cursor SQL when fetching the next latest-outcome page`, async () => {
    const { prisma, query } = makeQuery();
    prisma.$queryRaw.mockResolvedValueOnce([]);

    await query.listInconsistentOutcomeChains(
      {
        dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
        dateTo: new Date(`2026-04-20T00:00:00.000Z`),
        limit: 10,
        cursor: {
          createdAt: new Date(`2026-04-05T10:00:00.000Z`),
          id: `550e8400-e29b-41d4-a716-446655440002`,
        },
      },
      new Date(`2026-04-20T00:00:00.000Z`),
    );

    const sql = queryToString(prisma.$queryRaw.mock.calls[0][0]);
    expect(sql).toContain(`AND (`);
    expect(sql).toContain(`le.id <`);
    expect(sql).toContain(`ORDER BY latest.created_at DESC, le.id DESC`);
  });
});
