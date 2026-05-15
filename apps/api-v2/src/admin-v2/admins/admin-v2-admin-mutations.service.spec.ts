import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AdminV2AdminAuditTrail } from './admin-v2-admin-audit-trail';
import { AdminV2AdminMutationsRepository } from './admin-v2-admin-mutations.repository';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { AdminV2AdminMutationsService } from './admin-v2-admin-mutations.service';

describe(`AdminV2AdminMutationsService`, () => {
  async function buildService() {
    const repository = {
      patchAdminPassword: jest.fn(),
      updateAdminStatus: jest.fn(),
      getAdminLifecycleTarget: jest.fn(),
      getAdminRoleMutationTarget: jest.fn(),
      getAdminPermissionMutationTarget: jest.fn(),
      getRoleByKey: jest.fn(),
      listRelevantPermissions: jest.fn(),
      deactivateAdmin: jest.fn(),
      findAdminUpdatedAt: jest.fn(),
      revokeActiveSessions: jest.fn(),
      deleteRefreshTokens: jest.fn(),
      createAuditEntry: jest.fn(),
      findAdminLifecycleResult: jest.fn(),
      restoreAdmin: jest.fn(),
      changeAdminRole: jest.fn(),
      findAdminRoleResult: jest.fn(),
      replaceAdminPermissionOverrides: jest.fn(),
      touchAdminPermissions: jest.fn(),
      findAdminPermissionResult: jest.fn(),
    };
    const idempotency = {
      executeInTransaction: jest.fn(async ({ execute }: { execute: (tx: unknown) => Promise<unknown> }) =>
        execute({ tx: true }),
      ),
    };
    const auditTrail = {
      recordAdminActionAudit: jest.fn(async () => undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminV2AdminMutationsService,
        { provide: AdminV2AdminMutationsRepository, useValue: repository },
        { provide: AdminV2IdempotencyService, useValue: idempotency },
        { provide: AdminV2AdminAuditTrail, useValue: auditTrail },
      ],
    }).compile();

    return {
      service: moduleRef.get(AdminV2AdminMutationsService),
      repository,
      idempotency,
      auditTrail,
    };
  }

  it(`records compatibility audit after patching an admin password through the repository`, async () => {
    const { service, repository, auditTrail } = await buildService();
    repository.patchAdminPassword.mockResolvedValueOnce({
      id: `admin-2`,
      email: `ops@example.com`,
      type: `ADMIN`,
      deletedAt: null,
      updatedAt: new Date(`2026-04-17T10:00:00.000Z`),
    });

    const result = await service.patchAdminPassword(`admin-2`, `VerySecurePass1!`, `admin-1`, {
      ipAddress: `203.0.113.5`,
      userAgent: `jest`,
    });

    expect(repository.patchAdminPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        targetAdminId: `admin-2`,
        hash: expect.any(String),
        salt: expect.any(String),
      }),
    );
    expect(auditTrail.recordAdminActionAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: `admin-1`,
        action: `admin_password_change`,
        resourceId: `admin-2`,
      }),
    );
    expect(result).toEqual({
      adminId: `admin-2`,
      email: `ops@example.com`,
      type: `ADMIN`,
      status: `ACTIVE`,
      version: new Date(`2026-04-17T10:00:00.000Z`).getTime(),
    });
  });

  it(`returns alreadyInactive without opening a transaction`, async () => {
    const { service, repository } = await buildService();
    const updatedAt = new Date(`2026-04-17T10:00:00.000Z`);
    const deletedAt = new Date(`2026-04-17T10:05:00.000Z`);
    repository.getAdminLifecycleTarget.mockResolvedValueOnce({
      id: `admin-2`,
      email: `ops@example.com`,
      deletedAt,
      updatedAt,
    });

    const result = await service.deactivateAdmin(
      `admin-2`,
      `admin-1`,
      { version: updatedAt.getTime(), confirmed: true },
      { idempotencyKey: `idem-1` },
    );

    expect(repository.deactivateAdmin).not.toHaveBeenCalled();
    expect(result).toEqual({
      adminId: `admin-2`,
      status: `INACTIVE`,
      deletedAt: deletedAt.toISOString(),
      version: updatedAt.getTime(),
      alreadyInactive: true,
    });
  });

  it(`routes deactivation through idempotency and the transaction runner`, async () => {
    const { service, repository, idempotency } = await buildService();
    const updatedAt = new Date(`2026-04-17T10:00:00.000Z`);
    repository.getAdminLifecycleTarget.mockResolvedValueOnce({
      id: `admin-2`,
      email: `ops@example.com`,
      deletedAt: null,
      updatedAt,
    });
    repository.deactivateAdmin.mockResolvedValueOnce({ count: 1 });
    repository.findAdminLifecycleResult.mockResolvedValueOnce({
      id: `admin-2`,
      updatedAt: new Date(`2026-04-17T10:05:00.000Z`),
      deletedAt: new Date(`2026-04-17T10:05:00.000Z`),
    });

    await expect(
      service.deactivateAdmin(
        `admin-2`,
        `admin-1`,
        { version: updatedAt.getTime(), confirmed: true, reason: `Ops handoff` },
        { idempotencyKey: `idem-2`, ipAddress: `127.0.0.1`, userAgent: `jest` },
      ),
    ).resolves.toMatchObject({
      adminId: `admin-2`,
      status: `INACTIVE`,
      alreadyInactive: false,
    });

    expect(idempotency.executeInTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: `admin-1`,
        scope: `admin-deactivate:admin-2`,
        key: `idem-2`,
      }),
    );
    expect(repository.deactivateAdmin).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        targetId: `admin-2`,
        expectedUpdatedAt: updatedAt,
      }),
    );
  });

  it(`rejects non-overridable capabilities before hitting the repository`, async () => {
    const { service, repository } = await buildService();

    await expect(
      service.changeAdminPermissions(
        `admin-2`,
        `admin-1`,
        {
          version: 1,
          capabilityOverrides: [{ capability: `me.read`, mode: `grant` }],
        },
        { idempotencyKey: `idem-3` },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.getAdminPermissionMutationTarget).not.toHaveBeenCalled();
  });

  it(`returns alreadyApplied when capability overrides do not change the effective state`, async () => {
    const { service, repository } = await buildService();
    const updatedAt = new Date(`2026-04-17T10:00:00.000Z`);
    repository.getAdminPermissionMutationTarget.mockResolvedValueOnce({
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
    });
    repository.listRelevantPermissions.mockResolvedValueOnce([{ id: `perm-1`, capability: `admins.manage` }]);

    const result = await service.changeAdminPermissions(
      `admin-2`,
      `admin-1`,
      {
        version: updatedAt.getTime(),
        capabilityOverrides: [{ capability: `admins.manage`, mode: `grant` }],
      },
      { idempotencyKey: `idem-4` },
    );

    expect(repository.replaceAdminPermissionOverrides).not.toHaveBeenCalled();
    expect(result).toEqual({
      adminId: `admin-2`,
      version: updatedAt.getTime(),
      overrides: [{ capability: `admins.manage`, mode: `grant` }],
      alreadyApplied: true,
    });
  });

  it(`bubbles up stale version conflicts before delegation`, async () => {
    const { service, repository } = await buildService();
    repository.getAdminRoleMutationTarget.mockResolvedValueOnce({
      id: `admin-2`,
      email: `ops@example.com`,
      type: `ADMIN`,
      updatedAt: new Date(`2026-04-17T10:05:00.000Z`),
      deletedAt: null,
      role: { id: `role-1`, key: `OPS_ADMIN` },
    });

    await expect(
      service.changeAdminRole(
        `admin-2`,
        `admin-1`,
        { version: new Date(`2026-04-17T10:00:00.000Z`).getTime(), confirmed: true, roleKey: `SUPER_ADMIN` },
        { idempotencyKey: `idem-5` },
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(repository.changeAdminRole).not.toHaveBeenCalled();
  });
});
