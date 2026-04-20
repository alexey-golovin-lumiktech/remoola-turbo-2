import { AdminV2LedgerAnomaliesController } from './admin-v2-ledger-anomalies.controller';

describe(`AdminV2LedgerAnomaliesController`, () => {
  it(`guards summary and list routes with ledger.anomalies capability`, async () => {
    const assertCapability = jest.fn(async () => ({
      role: `OPS_ADMIN`,
      capabilities: [`ledger.anomalies`],
      workspaces: [`ledger`],
      source: `schema`,
    }));
    const getSummary = jest.fn(async () => ({
      computedAt: `2026-04-20T00:00:00.000Z`,
      classes: {},
      totalCount: 0,
    }));
    const getList = jest.fn(async () => ({
      class: `stalePendingEntries`,
      items: [],
      nextCursor: null,
      computedAt: `2026-04-20T00:00:00.000Z`,
    }));
    const controller = new AdminV2LedgerAnomaliesController(
      {
        getSummary,
        getList,
      } as never,
      {
        assertCapability,
      } as never,
    );

    await controller.getSummary({
      id: `admin-1`,
      email: `ops@example.com`,
      type: `ADMIN`,
      sessionId: `session-1`,
    } as never);

    await controller.getList(
      {
        id: `admin-1`,
        email: `ops@example.com`,
        type: `ADMIN`,
        sessionId: `session-1`,
      } as never,
      {
        class: `largeValueOutliers`,
        dateFrom: `2026-04-01T00:00:00.000Z`,
        dateTo: `2026-04-20T00:00:00.000Z`,
        cursor: `cursor-1`,
        limit: `10`,
      },
    );

    expect(assertCapability).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: `admin-1` }), `ledger.anomalies`);
    expect(getSummary).toHaveBeenCalledTimes(1);
    expect(assertCapability).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: `admin-1` }), `ledger.anomalies`);
    expect(getList).toHaveBeenCalledWith({
      className: `largeValueOutliers`,
      dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
      dateTo: new Date(`2026-04-20T00:00:00.000Z`),
      cursor: `cursor-1`,
      limit: 10,
    });
  });
});
