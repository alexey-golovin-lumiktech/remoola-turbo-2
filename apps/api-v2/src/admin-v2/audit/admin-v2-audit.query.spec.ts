import { AdminV2AuditQuery } from './admin-v2-audit.query';

describe(`AdminV2AuditQuery`, () => {
  it(`lists auth audit rows with descending createdAt order and total count`, async () => {
    const findMany = jest.fn(async () => []);
    const count = jest.fn(async () => 0);
    const query = new AdminV2AuditQuery({
      authAuditLogModel: { findMany, count },
    } as never);

    await query.listAuthAudit({
      where: { identityType: `admin` },
      skip: 20,
      take: 10,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { identityType: `admin` },
        orderBy: { createdAt: `desc` },
        skip: 20,
        take: 10,
      }),
    );
    expect(count).toHaveBeenCalledWith({ where: { identityType: `admin` } });
  });

  it(`lists admin action audit rows including admin email and total count`, async () => {
    const findMany = jest.fn(async () => []);
    const count = jest.fn(async () => 0);
    const query = new AdminV2AuditQuery({
      adminActionAuditLogModel: { findMany, count },
    } as never);

    await query.listAdminActionAudit({
      where: { action: `saved_view_update` },
      skip: 0,
      take: 25,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { action: `saved_view_update` },
        include: { admin: { select: { email: true } } },
        orderBy: { createdAt: `desc` },
        skip: 0,
        take: 25,
      }),
    );
    expect(count).toHaveBeenCalledWith({ where: { action: `saved_view_update` } });
  });

  it(`lists consumer action audit rows with descending createdAt order and total count`, async () => {
    const findMany = jest.fn(async () => []);
    const count = jest.fn(async () => 0);
    const query = new AdminV2AuditQuery({
      consumerActionLogModel: { findMany, count },
    } as never);

    await query.listConsumerActionAudit({
      where: { consumerId: `consumer-1` },
      skip: 40,
      take: 20,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { consumerId: `consumer-1` },
        orderBy: { createdAt: `desc` },
        skip: 40,
        take: 20,
      }),
    );
    expect(count).toHaveBeenCalledWith({ where: { consumerId: `consumer-1` } });
  });
});
