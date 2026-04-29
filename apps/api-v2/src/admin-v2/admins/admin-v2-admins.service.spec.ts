import { BadRequestException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { AdminV2AdminAuditTrail } from './admin-v2-admin-audit-trail';
import { AdminV2AdminInvitationsService } from './admin-v2-admin-invitations.service';
import { AdminV2AdminLinks } from './admin-v2-admin-links';
import { AdminV2AdminMutationsService } from './admin-v2-admin-mutations.service';
import { AdminV2AdminPasswordFlowsService } from './admin-v2-admin-password-flows.service';
import { AdminV2AdminsQueriesService } from './admin-v2-admins-queries.service';
import { AdminV2AdminsService } from './admin-v2-admins.service';

function createIdempotency() {
  return {
    execute: jest.fn(async ({ execute }: { execute: () => Promise<unknown> }) => execute()),
  };
}

function createService(params: {
  prisma: Record<string, unknown>;
  accessService: Record<string, unknown>;
  idempotency: Record<string, unknown>;
  jwtService: Record<string, unknown>;
  mailingService: Record<string, unknown>;
  originResolver: Record<string, unknown>;
}) {
  const links = new AdminV2AdminLinks(params.originResolver as never);
  const auditTrail = new AdminV2AdminAuditTrail(params.prisma as never, params.mailingService as never, links);

  return new AdminV2AdminsService(
    new AdminV2AdminsQueriesService(params.prisma as never, params.accessService as never),
    new AdminV2AdminMutationsService(params.prisma as never, params.idempotency as never, auditTrail),
    new AdminV2AdminInvitationsService(
      params.prisma as never,
      params.idempotency as never,
      params.jwtService as never,
      links,
      auditTrail,
    ),
    new AdminV2AdminPasswordFlowsService(params.prisma as never, params.idempotency as never, auditTrail),
  );
}

describe(`AdminV2AdminsService`, () => {
  it(`keeps list and detail contracts inclusive of inactive admins and pending invitations`, async () => {
    jest.useFakeTimers().setSystemTime(new Date(`2026-04-23T12:00:00.000Z`));

    const accessService = {
      getAccessProfile: jest.fn(async (identity: { id: string }) => ({
        source: `schema`,
        role: identity.id === `admin-1` ? `SUPER_ADMIN` : `OPS_ADMIN`,
        capabilities: identity.id === `admin-1` ? [`admins.read`, `admins.manage`] : [`admins.read`],
        workspaces: [`admins`],
      })),
    };
    const service = createService({
      prisma: {
        adminModel: {
          findMany: jest.fn(async () => [
            {
              id: `admin-1`,
              email: `super@example.com`,
              type: $Enums.AdminType.SUPER,
              createdAt: new Date(`2026-04-17T08:00:00.000Z`),
              updatedAt: new Date(`2026-04-17T08:10:00.000Z`),
              deletedAt: null,
              role: { key: `SUPER_ADMIN` },
            },
            {
              id: `admin-2`,
              email: `ops@example.com`,
              type: $Enums.AdminType.ADMIN,
              createdAt: new Date(`2026-04-17T08:20:00.000Z`),
              updatedAt: new Date(`2026-04-17T08:30:00.000Z`),
              deletedAt: new Date(`2026-04-17T08:35:00.000Z`),
              role: { key: `OPS_ADMIN` },
            },
          ]),
          count: jest.fn(async () => 2),
        },
        adminInvitationModel: {
          findMany: jest.fn(async () => [
            {
              id: `inv-1`,
              email: `invitee@example.com`,
              expiresAt: new Date(`2026-04-24T08:00:00.000Z`),
              acceptedAt: null,
              createdAt: new Date(`2026-04-17T08:05:00.000Z`),
              role: { key: `OPS_ADMIN` },
              invitedByAdmin: { id: `admin-1`, email: `super@example.com` },
            },
          ]),
        },
        authAuditLogModel: {
          findMany: jest.fn(async () => [{ identityId: `admin-1`, createdAt: new Date(`2026-04-17T09:00:00.000Z`) }]),
        },
        adminActionAuditLogModel: {
          findMany: jest.fn(async () => [{ adminId: `admin-2`, createdAt: new Date(`2026-04-17T09:10:00.000Z`) }]),
        },
      },
      accessService,
      idempotency: createIdempotency(),
      jwtService: {
        signAsync: jest.fn(),
        verify: jest.fn(),
      },
      mailingService: {},
      originResolver: {
        normalizeOrigin: jest.fn((value: string) => value),
        resolveConfiguredAdminOrigin: jest.fn(() => `https://admin.example.com`),
      },
    });

    try {
      await expect(service.listAdmins()).resolves.toEqual({
        items: [
          {
            id: `admin-1`,
            email: `super@example.com`,
            type: `SUPER`,
            role: `SUPER_ADMIN`,
            status: `ACTIVE`,
            lastActivityAt: `2026-04-17T09:00:00.000Z`,
            createdAt: `2026-04-17T08:00:00.000Z`,
            updatedAt: `2026-04-17T08:10:00.000Z`,
            deletedAt: null,
          },
          {
            id: `admin-2`,
            email: `ops@example.com`,
            type: `ADMIN`,
            role: `OPS_ADMIN`,
            status: `INACTIVE`,
            lastActivityAt: `2026-04-17T09:10:00.000Z`,
            createdAt: `2026-04-17T08:20:00.000Z`,
            updatedAt: `2026-04-17T08:30:00.000Z`,
            deletedAt: `2026-04-17T08:35:00.000Z`,
          },
        ],
        pendingInvitations: [
          {
            id: `inv-1`,
            email: `invitee@example.com`,
            role: `OPS_ADMIN`,
            status: `pending`,
            expiresAt: `2026-04-24T08:00:00.000Z`,
            createdAt: `2026-04-17T08:05:00.000Z`,
            invitedBy: {
              id: `admin-1`,
              email: `super@example.com`,
            },
          },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it(`rejects permissions-change requests that try to touch non-overridable capabilities`, async () => {
    const service = createService({
      prisma: {},
      accessService: {},
      idempotency: createIdempotency(),
      jwtService: {},
      mailingService: {},
      originResolver: {},
    });

    await expect(
      service.changeAdminPermissions(
        `admin-2`,
        `admin-1`,
        {
          version: 1,
          capabilityOverrides: [{ capability: `me.read`, mode: `grant` }],
        },
        { idempotencyKey: `idem-1` },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it(`returns alreadyApplied when permission overrides do not change the effective override set`, async () => {
    const updatedAt = new Date(`2026-04-17T10:00:00.000Z`);
    const service = createService({
      prisma: {
        adminModel: {
          findUnique: jest.fn(async () => ({
            id: `admin-2`,
            email: `ops@example.com`,
            updatedAt,
            deletedAt: null,
            permissionOverrides: [
              {
                id: `override-1`,
                granted: true,
                permissionId: `perm-1`,
                permission: { capability: `admins.manage` },
              },
            ],
          })),
        },
        adminPermissionModel: {
          findMany: jest.fn(async () => [{ id: `perm-1`, capability: `admins.manage` }]),
        },
      },
      accessService: {},
      idempotency: createIdempotency(),
      jwtService: {},
      mailingService: {},
      originResolver: {},
    });

    await expect(
      service.changeAdminPermissions(
        `admin-2`,
        `admin-1`,
        {
          version: updatedAt.getTime(),
          capabilityOverrides: [{ capability: `admins.manage`, mode: `grant` }],
        },
        { idempotencyKey: `idem-noop` },
      ),
    ).resolves.toEqual({
      adminId: `admin-2`,
      version: updatedAt.getTime(),
      overrides: [{ capability: `admins.manage`, mode: `grant` }],
      alreadyApplied: true,
    });
  });

  it(`accepts invitation tokens and creates admin rows with role-derived type`, async () => {
    const tx = {
      adminInvitationModel: {
        findUnique: jest.fn(async () => ({
          id: `inv-1`,
          email: `invitee@example.com`,
          roleId: `role-ops`,
          expiresAt: new Date(Date.now() + 60_000),
          acceptedAt: null,
        })),
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
      adminModel: {
        findFirst: jest.fn(async () => null),
        create: jest.fn(async () => ({
          id: `admin-2`,
          email: `invitee@example.com`,
        })),
      },
      adminRoleModel: {
        findUnique: jest.fn(async () => ({ key: `OPS_ADMIN` })),
      },
    };
    const prisma = {
      ...tx,
      $transaction: jest.fn(async (callback: (innerTx: typeof tx) => Promise<unknown>) => callback(tx as never)),
    };
    const service = createService({
      prisma,
      accessService: {},
      idempotency: createIdempotency(),
      jwtService: {
        signAsync: jest.fn(),
        verify: jest.fn(() => ({
          sub: `inv-1`,
          email: `invitee@example.com`,
          roleId: `role-ops`,
          typ: `admin_invitation`,
          scope: `admin_v2`,
        })),
      },
      mailingService: {},
      originResolver: {},
    });

    await expect(service.acceptInvitation({ token: `jwt`, password: `VerySecurePass1` })).resolves.toEqual({
      adminId: `admin-2`,
      email: `invitee@example.com`,
      accepted: true,
    });
    expect(prisma.adminModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: `invitee@example.com`,
          roleId: `role-ops`,
          type: `ADMIN`,
        }),
      }),
    );
  });

  it(`deactivateAdmin revokes legacy access refresh records alongside auth sessions`, async () => {
    const updatedAt = new Date(`2026-04-17T10:00:00.000Z`);
    const deactivatedAt = new Date(`2026-04-17T10:05:00.000Z`);
    const tx = {
      adminModel: {
        updateMany: jest.fn(async () => ({ count: 1 })),
        findUnique: jest.fn(async () => ({ updatedAt: deactivatedAt })),
        findUniqueOrThrow: jest.fn(async () => ({
          id: `admin-2`,
          updatedAt: deactivatedAt,
          deletedAt: deactivatedAt,
        })),
      },
      adminAuthSessionModel: {
        updateMany: jest.fn(async () => ({ count: 2 })),
      },
      accessRefreshTokenModel: {
        deleteMany: jest.fn(async () => ({ count: 1 })),
      },
      adminActionAuditLogModel: {
        create: jest.fn(async () => ({ id: `audit-1` })),
      },
    };
    const prisma = {
      adminModel: {
        findUnique: jest.fn(async () => ({
          id: `admin-2`,
          email: `ops@example.com`,
          deletedAt: null,
          updatedAt,
        })),
      },
      $transaction: jest.fn(async (callback: (innerTx: typeof tx) => Promise<unknown>) => callback(tx as never)),
    };
    const service = createService({
      prisma,
      accessService: {},
      idempotency: createIdempotency(),
      jwtService: {},
      mailingService: {},
      originResolver: {},
    });

    await expect(
      service.deactivateAdmin(
        `admin-2`,
        `admin-1`,
        { version: updatedAt.getTime(), confirmed: true },
        { idempotencyKey: `idem-1` },
      ),
    ).resolves.toMatchObject({
      adminId: `admin-2`,
      status: `INACTIVE`,
      alreadyInactive: false,
    });
    expect(tx.accessRefreshTokenModel.deleteMany).toHaveBeenCalledWith({
      where: {
        identityId: `admin-2`,
      },
    });
  });

  it(`inviteAdmin commits invitation state before a failed email send and records failed delivery`, async () => {
    const events: string[] = [];
    const tx = {
      adminInvitationModel: {
        create: jest.fn(async () => {
          events.push(`createInvitation`);
          return {
            id: `inv-1`,
            email: `invitee@example.com`,
            expiresAt: new Date(`2026-04-24T08:00:00.000Z`),
            createdAt: new Date(`2026-04-17T08:05:00.000Z`),
          };
        }),
      },
      adminActionAuditLogModel: {
        create: jest.fn(async () => {
          events.push(`createAudit`);
          return { id: `audit-1` };
        }),
      },
    };
    const prisma = {
      adminModel: {
        findFirst: jest.fn(async () => null),
      },
      adminRoleModel: {
        findFirst: jest.fn(async () => ({ id: `role-support`, key: `SUPPORT_ADMIN` })),
      },
      adminInvitationModel: {
        findFirst: jest.fn(async () => null),
      },
      adminActionAuditLogModel: {
        update: jest.fn(async () => {
          events.push(`updateAudit`);
          return { id: `audit-1` };
        }),
      },
      $transaction: jest.fn(async (callback: (innerTx: typeof tx) => Promise<unknown>) => {
        const result = await callback(tx as never);
        events.push(`commit`);
        return result;
      }),
    };
    const mailingService = {
      sendInvitationEmail: jest.fn(async () => {
        events.push(`sendMail`);
        throw new Error(`smtp down`);
      }),
    };
    const service = createService({
      prisma,
      accessService: {},
      idempotency: createIdempotency(),
      jwtService: {
        signAsync: jest.fn(async () => `invite-token`),
      },
      mailingService,
      originResolver: {
        normalizeOrigin: jest.fn((value: string) => value),
        resolveConfiguredAdminOrigin: jest.fn(() => `https://admin.example.com`),
      },
    });

    await expect(
      service.inviteAdmin(
        `admin-1`,
        { email: `invitee@example.com`, roleKey: `SUPPORT_ADMIN` },
        { idempotencyKey: `idem-2` },
      ),
    ).resolves.toMatchObject({
      invitationId: `inv-1`,
      alreadyPending: false,
      notificationSent: false,
      deliveryStatus: `failed`,
    });
    expect(events).toEqual([`createInvitation`, `createAudit`, `commit`, `sendMail`, `updateAudit`]);
  });

  it(`resetAdminPassword records failed delivery after commit instead of rolling back reset artifacts`, async () => {
    const updatedAt = new Date(`2026-04-17T12:00:00.000Z`);
    const events: string[] = [];
    const tx = {
      resetPasswordModel: {
        updateMany: jest.fn(async () => ({ count: 1 })),
        create: jest.fn(async () => {
          events.push(`createReset`);
          return { id: `reset-1` };
        }),
      },
      adminActionAuditLogModel: {
        create: jest.fn(async () => {
          events.push(`createAudit`);
          return { id: `audit-2` };
        }),
      },
    };
    const prisma = {
      adminModel: {
        findUnique: jest.fn(async () => ({
          id: `admin-2`,
          email: `ops@example.com`,
          updatedAt,
          deletedAt: null,
        })),
      },
      adminActionAuditLogModel: {
        update: jest.fn(async () => {
          events.push(`updateAudit`);
          return { id: `audit-2` };
        }),
      },
      $transaction: jest.fn(async (callback: (innerTx: typeof tx) => Promise<unknown>) => {
        const result = await callback(tx as never);
        events.push(`commit`);
        return result;
      }),
    };
    const mailingService = {
      sendAdminV2PasswordResetEmail: jest.fn(async () => {
        events.push(`sendMail`);
        return false;
      }),
    };
    const service = createService({
      prisma,
      accessService: {},
      idempotency: createIdempotency(),
      jwtService: {},
      mailingService,
      originResolver: {
        normalizeOrigin: jest.fn((value: string) => value),
        resolveConfiguredAdminOrigin: jest.fn(() => `https://admin.example.com`),
      },
    });

    await expect(
      service.resetAdminPassword(`admin-2`, `admin-1`, { version: updatedAt.getTime() }, { idempotencyKey: `idem-3` }),
    ).resolves.toMatchObject({
      adminId: `admin-2`,
      notificationSent: false,
      deliveryStatus: `failed`,
    });
    expect(events).toEqual([`createReset`, `createAudit`, `commit`, `sendMail`, `updateAudit`]);
  });

  it(`requestPasswordReset creates a self-service reset artifact for active admins`, async () => {
    const events: string[] = [];
    const tx = {
      resetPasswordModel: {
        updateMany: jest.fn(async () => {
          events.push(`invalidatePrevious`);
          return { count: 1 };
        }),
        create: jest.fn(async () => {
          events.push(`createReset`);
          return { id: `reset-2` };
        }),
      },
      adminActionAuditLogModel: {
        create: jest.fn(async () => {
          events.push(`createAudit`);
          return { id: `audit-3` };
        }),
      },
    };
    const prisma = {
      adminModel: {
        findFirst: jest.fn(async () => ({
          id: `admin-2`,
          email: `ops@example.com`,
        })),
      },
      adminActionAuditLogModel: {
        update: jest.fn(async () => {
          events.push(`updateAudit`);
          return { id: `audit-3` };
        }),
      },
      $transaction: jest.fn(async (callback: (innerTx: typeof tx) => Promise<unknown>) => {
        const result = await callback(tx as never);
        events.push(`commit`);
        return result;
      }),
    };
    const mailingService = {
      sendAdminV2PasswordResetEmail: jest.fn(async () => {
        events.push(`sendMail`);
        return true;
      }),
    };
    const service = createService({
      prisma,
      accessService: {},
      idempotency: createIdempotency(),
      jwtService: {},
      mailingService,
      originResolver: {
        normalizeOrigin: jest.fn((value: string) => value),
        resolveConfiguredAdminOrigin: jest.fn(() => `https://admin.example.com`),
      },
    });

    await expect(service.requestPasswordReset({ email: `ops@example.com` })).resolves.toBeUndefined();
    expect(tx.adminActionAuditLogModel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adminId: `admin-2`,
        action: `admin_password_reset`,
        resource: `admin`,
        resourceId: `admin-2`,
        metadata: expect.objectContaining({
          targetEmail: `ops@example.com`,
          initiatedBy: `self_service`,
          deliveryStatus: `pending`,
        }),
      }),
      select: { id: true },
    });
    expect(mailingService.sendAdminV2PasswordResetEmail).toHaveBeenCalledWith({
      email: `ops@example.com`,
      forgotPasswordLink: expect.stringContaining(`https://admin.example.com/reset-password?token=`),
    });
    expect(events).toEqual([`invalidatePrevious`, `createReset`, `createAudit`, `commit`, `sendMail`, `updateAudit`]);
  });

  it(`requestPasswordReset stays generic for unknown admins`, async () => {
    const prisma = {
      adminModel: {
        findFirst: jest.fn(async () => null),
      },
    };
    const mailingService = {
      sendAdminV2PasswordResetEmail: jest.fn(async () => true),
    };
    const service = createService({
      prisma,
      accessService: {},
      idempotency: createIdempotency(),
      jwtService: {},
      mailingService,
      originResolver: {},
    });

    await expect(service.requestPasswordReset({ email: `missing@example.com` })).resolves.toBeUndefined();
    expect(mailingService.sendAdminV2PasswordResetEmail).not.toHaveBeenCalled();
  });

  it(`resetPasswordWithToken revokes legacy access refresh records`, async () => {
    const tx = {
      resetPasswordModel: {
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
      adminModel: {
        update: jest.fn(async () => ({ id: `admin-2` })),
      },
      adminAuthSessionModel: {
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
      accessRefreshTokenModel: {
        deleteMany: jest.fn(async () => ({ count: 1 })),
      },
    };
    const prisma = {
      resetPasswordModel: {
        findFirst: jest.fn(async () => ({ id: `reset-1`, adminId: `admin-2` })),
      },
      adminModel: {
        findFirst: jest.fn(async () => ({
          id: `admin-2`,
          email: `invitee@example.com`,
        })),
      },
      $transaction: jest.fn(async (callback: (innerTx: typeof tx) => Promise<unknown>) => callback(tx as never)),
    };
    const service = createService({
      prisma,
      accessService: {},
      idempotency: createIdempotency(),
      jwtService: {},
      mailingService: {},
      originResolver: {},
    });

    await expect(
      service.resetPasswordWithToken({ token: `reset-token`, password: `VerySecurePass1` }),
    ).resolves.toMatchObject({
      success: true,
      adminId: `admin-2`,
    });
    expect(tx.accessRefreshTokenModel.deleteMany).toHaveBeenCalledWith({
      where: {
        identityId: `admin-2`,
      },
    });
  });
});
