import { AdminV2SavedViewsQuery } from './admin-v2-saved-views.query';

describe(`AdminV2SavedViewsQuery`, () => {
  it(`lists owner-scoped active saved views ordered by name with a hard cap`, async () => {
    const findMany = jest.fn(async () => []);
    const query = new AdminV2SavedViewsQuery({
      savedViewModel: { findMany },
    } as never);

    await query.listOwnedActiveViews({
      ownerId: `admin-1`,
      workspace: `ledger_anomalies`,
      take: 200,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerId: `admin-1`, workspace: `ledger_anomalies`, deletedAt: null },
        orderBy: { name: `asc` },
        take: 200,
      }),
    );
  });
});
