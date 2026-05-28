import { describe, expect, it, jest } from '@jest/globals';

import { AdminV2OperationalAlertsQuery } from './admin-v2-operational-alerts.query';

describe(`AdminV2OperationalAlertsQuery`, () => {
  it(`lists owner-scoped active alerts ordered by name with a hard cap`, async () => {
    const findMany = jest.fn<(...a: any[]) => any>(async () => []);
    const query = new AdminV2OperationalAlertsQuery({
      operationalAlertModel: { findMany },
    } as never);

    await query.listOwnedActiveAlerts({
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
