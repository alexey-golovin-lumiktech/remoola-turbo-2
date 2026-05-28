import { describe, expect, it, jest } from '@jest/globals';

import { Prisma } from '@remoola/database-2';

import { AdminV2AdminAuditTrailRepository } from './admin-v2-admin-audit-trail.repository';

describe(`AdminV2AdminAuditTrailRepository`, () => {
  function makeRepository() {
    const prisma = {
      adminActionAuditLogModel: {
        update: jest.fn<(...a: any[]) => any>(async () => null),
        create: jest.fn<(...a: any[]) => any>(async () => null),
      },
    };

    return {
      prisma,
      repository: new AdminV2AdminAuditTrailRepository(prisma as never),
    };
  }

  it(`updates notification metadata for an audit row`, async () => {
    const { prisma, repository } = makeRepository();
    const metadata = {
      targetEmail: `admin@example.com`,
      notificationSent: true,
      notificationType: `email`,
      deliveryStatus: `sent`,
    } satisfies Prisma.InputJsonValue;

    await repository.updateNotificationStatus({
      auditId: `audit-1`,
      metadata,
    });

    expect(prisma.adminActionAuditLogModel.update).toHaveBeenCalledWith({
      where: { id: `audit-1` },
      data: {
        metadata,
      },
    });
  });

  it(`creates admin audit rows with admin resource semantics`, async () => {
    const { prisma, repository } = makeRepository();

    await repository.createAdminAuditEntry({
      adminId: `admin-1`,
      action: `admin_restore`,
      resourceId: `admin-2`,
      metadata: { previousState: `deleted` } satisfies Prisma.InputJsonValue,
      ipAddress: `127.0.0.1`,
      userAgent: `jest`,
    });

    expect(prisma.adminActionAuditLogModel.create).toHaveBeenCalledWith({
      data: {
        adminId: `admin-1`,
        action: `admin_restore`,
        resource: `admin`,
        resourceId: `admin-2`,
        metadata: { previousState: `deleted` },
        ipAddress: `127.0.0.1`,
        userAgent: `jest`,
      },
    });
  });

  it(`defaults missing metadata and request context fields`, async () => {
    const { prisma, repository } = makeRepository();

    await repository.createAdminAuditEntry({
      adminId: `admin-1`,
      action: `admin_restore`,
      resourceId: `admin-2`,
    });

    expect(prisma.adminActionAuditLogModel.create).toHaveBeenCalledWith({
      data: {
        adminId: `admin-1`,
        action: `admin_restore`,
        resource: `admin`,
        resourceId: `admin-2`,
        metadata: Prisma.JsonNull,
        ipAddress: null,
        userAgent: null,
      },
    });
  });
});
