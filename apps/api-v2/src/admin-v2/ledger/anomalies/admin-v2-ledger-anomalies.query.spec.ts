import { type AdminV2LedgerAnomaliesLatestOutcomeQuery } from './admin-v2-ledger-anomalies-latest-outcome.query';
import { type AdminV2LedgerAnomaliesValueIntegrityQuery } from './admin-v2-ledger-anomalies-value-integrity.query';
import { AdminV2LedgerAnomaliesQuery } from './admin-v2-ledger-anomalies.query';

describe(`AdminV2LedgerAnomaliesQuery`, () => {
  function makeQuery() {
    const latestOutcomeQuery = {
      countStalePendingEntries: jest.fn(async () => 0),
      countInconsistentOutcomeChains: jest.fn(async () => 0),
      listStalePendingEntries: jest.fn(async () => []),
      listInconsistentOutcomeChains: jest.fn(async () => []),
      countStalePendingEntriesForRange: jest.fn(async () => 0),
      countInconsistentOutcomeChainsForRange: jest.fn(async () => 0),
    };
    const valueIntegrityQuery = {
      countLargeValueOutliers: jest.fn(async () => 0),
      countOrphanedEntries: jest.fn(async () => 0),
      countDuplicateIdempotencyRisk: jest.fn(async () => 0),
      countImpossibleTransitions: jest.fn(async () => 0),
      listLargeValueOutliers: jest.fn(async () => []),
      listOrphanedEntries: jest.fn(async () => []),
      listDuplicateIdempotencyRisk: jest.fn(async () => []),
      listImpossibleTransitions: jest.fn(async () => []),
      countLargeValueOutliersForRange: jest.fn(async () => 0),
      countOrphanedEntriesForRange: jest.fn(async () => 0),
      countDuplicateIdempotencyRiskForRange: jest.fn(async () => 0),
      countImpossibleTransitionsForRange: jest.fn(async () => 0),
    };

    return {
      latestOutcomeQuery,
      valueIntegrityQuery,
      query: new AdminV2LedgerAnomaliesQuery(
        latestOutcomeQuery as unknown as AdminV2LedgerAnomaliesLatestOutcomeQuery,
        valueIntegrityQuery as unknown as AdminV2LedgerAnomaliesValueIntegrityQuery,
      ),
    };
  }

  it(`delegates latest-outcome summary counts to the latest-outcome collaborator`, async () => {
    const { latestOutcomeQuery, query } = makeQuery();
    latestOutcomeQuery.countStalePendingEntries.mockResolvedValueOnce(4);

    const result = await query.countStalePendingEntries(new Date(`2026-04-10T00:00:00.000Z`));

    expect(result).toBe(4);
    expect(latestOutcomeQuery.countStalePendingEntries).toHaveBeenCalledWith(new Date(`2026-04-10T00:00:00.000Z`));
  });

  it(`delegates value-integrity range counts to the value-integrity collaborator`, async () => {
    const { valueIntegrityQuery, query } = makeQuery();
    valueIntegrityQuery.countLargeValueOutliersForRange.mockResolvedValueOnce(2);

    const result = await query.countLargeValueOutliersForRange(
      new Date(`2026-04-01T00:00:00.000Z`),
      new Date(`2026-04-20T00:00:00.000Z`),
    );

    expect(result).toBe(2);
    expect(valueIntegrityQuery.countLargeValueOutliersForRange).toHaveBeenCalledWith(
      new Date(`2026-04-01T00:00:00.000Z`),
      new Date(`2026-04-20T00:00:00.000Z`),
    );
  });

  it(`delegates latest-outcome list reads with params and now`, async () => {
    const { latestOutcomeQuery, query } = makeQuery();
    latestOutcomeQuery.listStalePendingEntries.mockResolvedValueOnce([]);

    await query.listStalePendingEntries(
      {
        dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
        dateTo: new Date(`2026-04-20T00:00:00.000Z`),
        limit: 25,
        cursor: null,
      },
      new Date(`2026-04-20T00:00:00.000Z`),
    );

    expect(latestOutcomeQuery.listStalePendingEntries).toHaveBeenCalledWith(
      {
        dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
        dateTo: new Date(`2026-04-20T00:00:00.000Z`),
        limit: 25,
        cursor: null,
      },
      new Date(`2026-04-20T00:00:00.000Z`),
    );
  });

  it(`delegates value-integrity list reads to the value-integrity collaborator`, async () => {
    const { valueIntegrityQuery, query } = makeQuery();
    valueIntegrityQuery.listImpossibleTransitions.mockResolvedValueOnce([]);

    await query.listImpossibleTransitions({
      dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
      dateTo: new Date(`2026-04-20T00:00:00.000Z`),
      limit: 5,
      cursor: null,
    });

    expect(valueIntegrityQuery.listImpossibleTransitions).toHaveBeenCalledWith({
      dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
      dateTo: new Date(`2026-04-20T00:00:00.000Z`),
      limit: 5,
      cursor: null,
    });
  });
});
