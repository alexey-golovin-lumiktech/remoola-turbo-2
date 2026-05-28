import { describe, expect, it, jest } from '@jest/globals';

import { AdminV2OperationalAlertsAuthRefreshReuseQuery } from './admin-v2-operational-alerts-auth-refresh-reuse.query';
import { AUTH_AUDIT_EVENTS } from '../../shared/auth-audit.service';

describe(`AdminV2OperationalAlertsAuthRefreshReuseQuery`, () => {
  it(`counts admin refresh reuse events since the cutoff`, async () => {
    const count = jest.fn<(...a: any[]) => any>(async () => 7);
    const query = new AdminV2OperationalAlertsAuthRefreshReuseQuery({
      authAuditLogModel: { count },
    } as never);
    const since = new Date(`2026-04-21T11:50:00.000Z`);

    const result = await query.countRefreshReuseSince(since);

    expect(result).toBe(7);
    expect(count).toHaveBeenCalledWith({
      where: {
        identityType: `admin`,
        event: AUTH_AUDIT_EVENTS.refresh_reuse,
        createdAt: { gte: since },
      },
    });
  });
});
