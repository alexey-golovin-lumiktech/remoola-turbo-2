import { AdminV2AdminsActivityQuery } from './admin-v2-admins-activity.query';

describe(`AdminV2AdminsActivityQuery`, () => {
  it(`loads last-activity sources from auth and admin-action audits`, async () => {
    const authFindMany = jest.fn(async () => []);
    const adminActionFindMany = jest.fn(async () => []);
    const query = new AdminV2AdminsActivityQuery({
      authAuditLogModel: { findMany: authFindMany },
      adminActionAuditLogModel: { findMany: adminActionFindMany },
    } as never);

    await query.listLastActivitySources([`admin-1`, `admin-2`]);

    expect(authFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          identityType: `admin`,
          identityId: { in: [`admin-1`, `admin-2`] },
        },
        take: 10,
      }),
    );
    expect(adminActionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          adminId: { in: [`admin-1`, `admin-2`] },
        },
        take: 10,
      }),
    );
  });

  it(`loads recent audit and auth history with the requested limit`, async () => {
    const adminActionFindMany = jest.fn(async () => []);
    const authFindMany = jest.fn(async () => []);
    const query = new AdminV2AdminsActivityQuery({
      authAuditLogModel: { findMany: authFindMany },
      adminActionAuditLogModel: { findMany: adminActionFindMany },
    } as never);

    await query.listRecentAuditActions(`admin-1`, 20);
    await query.listRecentAuthEvents(`admin-1`, 20);

    expect(adminActionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { adminId: `admin-1` },
        take: 20,
        include: {
          admin: {
            select: {
              email: true,
            },
          },
        },
      }),
    );
    expect(authFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          identityType: `admin`,
          identityId: `admin-1`,
        },
        take: 20,
      }),
    );
  });
});
