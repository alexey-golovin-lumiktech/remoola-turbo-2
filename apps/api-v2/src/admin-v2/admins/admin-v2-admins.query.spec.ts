import { describe, expect, it, jest } from '@jest/globals';

import { AdminV2AdminsQuery } from './admin-v2-admins.query';

describe(`AdminV2AdminsQuery`, () => {
  it(`lists admins with count and stable ordering`, async () => {
    const count = jest.fn<(...a: any[]) => any>(async () => 1);
    const findMany = jest.fn<(...a: any[]) => any>(async () => []);
    const query = new AdminV2AdminsQuery({
      adminModel: { count, findMany },
    } as never);

    await query.listAdminsPage({
      where: { deletedAt: null },
      skip: 20,
      take: 10,
    });

    expect(count).toHaveBeenCalledWith({ where: { deletedAt: null } });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null },
        orderBy: [{ deletedAt: `asc` }, { updatedAt: `desc` }, { id: `desc` }],
        skip: 20,
        take: 10,
      }),
    );
  });

  it(`loads pending and related invitations with the expected filters`, async () => {
    const findMany = jest.fn<(...a: any[]) => any>(async () => []);
    const query = new AdminV2AdminsQuery({
      adminInvitationModel: { findMany },
    } as never);

    await query.listPendingInvitations(10);
    await query.listRelatedInvitations({ adminId: `admin-1`, email: `ops@example.com`, take: 5 });

    expect(findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { acceptedAt: null },
        take: 10,
      }),
    );
    expect(findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          OR: [{ email: `ops@example.com` }, { invitedBy: `admin-1` }],
        },
        take: 5,
      }),
    );
  });

  it(`loads the admin case base projection with settings, overrides, and authored counts`, async () => {
    const findFirst = jest.fn<(...a: any[]) => any>(async () => null);
    const query = new AdminV2AdminsQuery({
      adminModel: { findFirst },
    } as never);

    await query.findAdminCaseBase(`admin-1`);

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: `admin-1` },
        select: expect.objectContaining({
          adminSettings: expect.any(Object),
          permissionOverrides: expect.any(Object),
          _count: {
            select: {
              consumerNotes: true,
              consumerFlags: true,
            },
          },
        }),
      }),
    );
  });
});
