import { AdminV2ExchangeRateQuery } from './admin-v2-exchange-rate.query';
import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';

describe(`AdminV2ExchangeRateQuery`, () => {
  it(`lists rates with ordering and total count`, async () => {
    const count = jest.fn(async () => 1);
    const findMany = jest.fn(async () => []);
    const query = new AdminV2ExchangeRateQuery({
      exchangeRateModel: { count, findMany },
    } as never);

    await query.listRates({
      where: { deletedAt: null },
      skip: 20,
      take: 10,
    });

    expect(count).toHaveBeenCalledWith({ where: { deletedAt: null } });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null },
        orderBy: [{ effectiveAt: `desc` }, { createdAt: `desc` }, { id: `desc` }],
        skip: 20,
        take: 10,
      }),
    );
  });

  it(`loads rate approval history for exchange_rate approvals`, async () => {
    const findMany = jest.fn(async () => []);
    const query = new AdminV2ExchangeRateQuery({
      adminActionAuditLogModel: { findMany },
    } as never);

    await query.listApprovalHistory(`rate-1`);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          resource: `exchange_rate`,
          resourceId: `rate-1`,
          action: ADMIN_ACTION_AUDIT_ACTIONS.exchange_rate_approve,
        },
      }),
    );
  });
});
