import { AdminV2LedgerAnomaliesService } from './admin-v2-ledger-anomalies.service';

describe(`AdminV2LedgerAnomaliesService`, () => {
  function makeService() {
    return new AdminV2LedgerAnomaliesService({} as never);
  }

  it(`exposes the three anomaly classes in the summary contract`, async () => {
    const service = makeService();

    const summary = await service.getSummary();

    expect(summary.totalCount).toBeNull();
    expect(Object.keys(summary.classes)).toEqual([
      `stalePendingEntries`,
      `inconsistentOutcomeChains`,
      `largeValueOutliers`,
    ]);
    expect(summary.classes.stalePendingEntries.availability).toBe(`temporarily-unavailable`);
  });

  it(`returns an empty list shell for a requested class before query logic lands`, async () => {
    const service = makeService();

    const result = await service.getList({
      className: `largeValueOutliers`,
      dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
    });

    expect(result.class).toBe(`largeValueOutliers`);
    expect(result.items).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });
});
