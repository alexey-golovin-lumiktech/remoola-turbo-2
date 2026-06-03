import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AdminV2AdminAuditTrail } from './admin-v2-admin-audit-trail';
import { AdminV2AdminMutationsRepository } from './admin-v2-admin-mutations.repository';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { AdminV2AdminMutationsService } from './admin-v2-admin-mutations.service';

describe(`AdminV2AdminMutationsService`, () => {
  async function buildService() {
    const repository = {
      patchAdminPassword: jest.fn<(...a: any[]) => any>(),
      updateAdminStatus: jest.fn<(...a: any[]) => any>(),
      getAdminLifecycleTarget: jest.fn<(...a: any[]) => any>(),
      getAdminRoleMutationTarget: jest.fn<(...a: any[]) => any>(),
      getAdminPermissionMutationTarget: jest.fn<(...a: any[]) => any>(),
      getRoleByKey: jest.fn<(...a: any[]) => any>(),
      listRelevantPermissions: jest.fn<(...a: any[]) => any>(),
      deactivateAdmin: jest.fn<(...a: any[]) => any>(),
      findAdminUpdatedAt: jest.fn<(...a: any[]) => any>(),
      revokeActiveSessions: jest.fn<(...a: any[]) => any>(),
      deleteRefreshTokens: jest.fn<(...a: any[]) => any>(),
      createAuditEntry: jest.fn<(...a: any[]) => any>(),
      findAdminLifecycleResult: jest.fn<(...a: any[]) => any>(),
      restoreAdmin: jest.fn<(...a: any[]) => any>(),
      changeAdminRole: jest.fn<(...a: any[]) => any>(),
      findAdminRoleResult: jest.fn<(...a: any[]) => any>(),
      replaceAdminPermissionOverrides: jest.fn<(...a: any[]) => any>(),
      touchAdminPermissions: jest.fn<(...a: any[]) => any>(),
      findAdminPermissionResult: jest.fn<(...a: any[]) => any>(),
    };
    const idempotency = {
      executeInTransaction: jest.fn<(...a: any[]) => any>(
        async ({ execute }: { execute: (tx: unknown) => Promise<unknown> }) => execute({ tx: true }),
      ),
    };
    const auditTrail = {
      recordAdminActionAudit: jest.fn<(...a: any[]) => any>(async () => undefined),
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

  function buildLifecycleTarget(overrides: Record<string, unknown> = {}) {
    return {
      id: `admin-2`,
      email: `ops@example.com`,
      updatedAt: new Date(`2026-04-17T10:00:00.000Z`),
      deletedAt: null,
      ...overrides,
    };
  }

  function buildRoleTarget(overrides: Record<string, unknown> = {}) {
    return {
      ...buildLifecycleTarget(),
      type: `ADMIN`,
      role: { id: `role-1`, key: `OPS_ADMIN` },
      ...overrides,
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

  it.each([
    {
      action: `delete` as const,
      deletedAt: new Date(`2026-04-17T10:05:00.000Z`),
      expectedAuditAction: `admin_delete`,
      expectedStatus: `INACTIVE`,
    },
    {
      action: `restore` as const,
      deletedAt: null,
      expectedAuditAction: `admin_restore`,
      expectedStatus: `ACTIVE`,
    },
  ])(
    `keeps updateAdminStatus %s as a direct repository write plus compatibility audit`,
    async ({ action, deletedAt, expectedAuditAction, expectedStatus }) => {
      const { service, repository, auditTrail, idempotency } = await buildService();
      const updatedAt = new Date(`2026-04-17T10:00:00.000Z`);
      repository.updateAdminStatus.mockResolvedValueOnce({
        id: `admin-2`,
        email: `ops@example.com`,
        deletedAt,
        updatedAt,
      });

      const result = await service.updateAdminStatus(`admin-2`, action, `admin-1`, {
        ipAddress: `203.0.113.5`,
        userAgent: `jest`,
        idempotencyKey: `idem-status`,
      });

      expect(repository.updateAdminStatus).toHaveBeenCalledWith({
        targetAdminId: `admin-2`,
        action,
      });
      expect(idempotency.executeInTransaction).not.toHaveBeenCalled();
      expect(auditTrail.recordAdminActionAudit).toHaveBeenCalledWith({
        adminId: `admin-1`,
        action: expectedAuditAction,
        resourceId: `admin-2`,
        metadata: {
          targetEmail: `ops@example.com`,
        },
        ipAddress: `203.0.113.5`,
        userAgent: `jest`,
      });
      expect(result).toEqual({
        adminId: `admin-2`,
        status: expectedStatus,
        deletedAt: deletedAt?.toISOString() ?? null,
        version: updatedAt.getTime(),
      });
    },
  );

  it(`rejects restoreAdmin before idempotency when version is invalid`, async () => {
    const { service, repository, idempotency } = await buildService();

    await expect(
      service.restoreAdmin(`admin-2`, `admin-1`, { version: 0 }, { idempotencyKey: `idem-restore-invalid` }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(idempotency.executeInTransaction).not.toHaveBeenCalled();
    expect(repository.getAdminLifecycleTarget).not.toHaveBeenCalled();
  });

  it(`returns alreadyActive without restoring or auditing when restoreAdmin targets an active admin`, async () => {
    const { service, repository } = await buildService();
    const target = buildLifecycleTarget();
    repository.getAdminLifecycleTarget.mockResolvedValueOnce(target);

    const result = await service.restoreAdmin(
      `admin-2`,
      `admin-1`,
      { version: target.updatedAt.getTime() },
      { idempotencyKey: `idem-restore-noop`, ipAddress: `127.0.0.1`, userAgent: `jest` },
    );

    expect(repository.restoreAdmin).not.toHaveBeenCalled();
    expect(repository.createAuditEntry).not.toHaveBeenCalled();
    expect(result).toEqual({
      adminId: `admin-2`,
      status: `ACTIVE`,
      version: target.updatedAt.getTime(),
      alreadyActive: true,
    });
  });

  it(`restores admins through idempotency, audit persistence, and lifecycle result shaping`, async () => {
    const { service, repository, idempotency } = await buildService();
    const target = buildLifecycleTarget({
      deletedAt: new Date(`2026-04-17T10:05:00.000Z`),
    });
    const restoredUpdatedAt = new Date(`2026-04-17T10:10:00.000Z`);
    repository.getAdminLifecycleTarget.mockResolvedValueOnce(target);
    repository.restoreAdmin.mockResolvedValueOnce({ count: 1 });
    repository.findAdminLifecycleResult.mockResolvedValueOnce({
      id: `admin-2`,
      updatedAt: restoredUpdatedAt,
      deletedAt: null,
    });

    const result = await service.restoreAdmin(
      `admin-2`,
      `admin-1`,
      { version: target.updatedAt.getTime() },
      { idempotencyKey: `idem-restore-ok`, ipAddress: `127.0.0.1`, userAgent: `jest` },
    );

    expect(idempotency.executeInTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: `admin-1`,
        scope: `admin-restore:admin-2`,
        key: `idem-restore-ok`,
        payload: {
          targetAdminId: `admin-2`,
          expectedVersion: target.updatedAt.getTime(),
        },
      }),
    );
    expect(repository.restoreAdmin).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        targetId: `admin-2`,
        expectedUpdatedAt: target.updatedAt,
      }),
    );
    expect(repository.createAuditEntry).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        adminId: `admin-1`,
        action: `admin_restore`,
        resource: `admin`,
        resourceId: `admin-2`,
        metadata: {
          targetEmail: `ops@example.com`,
        },
        ipAddress: `127.0.0.1`,
        userAgent: `jest`,
      }),
    );
    expect(result).toEqual({
      adminId: `admin-2`,
      status: `ACTIVE`,
      deletedAt: null,
      version: restoredUpdatedAt.getTime(),
      alreadyActive: false,
    });
  });

  it(`surfaces stale restoreAdmin conflicts from the count=0 fallback lookup`, async () => {
    const { service, repository } = await buildService();
    const target = buildLifecycleTarget({
      deletedAt: new Date(`2026-04-17T10:05:00.000Z`),
    });
    const currentUpdatedAt = new Date(`2026-04-17T10:07:00.000Z`);
    repository.getAdminLifecycleTarget.mockResolvedValueOnce(target);
    repository.restoreAdmin.mockResolvedValueOnce({ count: 0 });
    repository.findAdminUpdatedAt.mockResolvedValueOnce({ updatedAt: currentUpdatedAt });

    await expect(
      service.restoreAdmin(
        `admin-2`,
        `admin-1`,
        { version: target.updatedAt.getTime() },
        { idempotencyKey: `idem-restore-stale` },
      ),
    ).rejects.toMatchObject({
      response: {
        error: `STALE_VERSION`,
        currentVersion: currentUpdatedAt.getTime(),
      },
    });

    expect(repository.findAdminLifecycleResult).not.toHaveBeenCalled();
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

  it(`rejects deactivateAdmin when confirmation is missing before idempotency`, async () => {
    const { service, repository, idempotency } = await buildService();

    await expect(
      service.deactivateAdmin(`admin-2`, `admin-1`, { version: 1, confirmed: false }, { idempotencyKey: `idem-a` }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(idempotency.executeInTransaction).not.toHaveBeenCalled();
    expect(repository.getAdminLifecycleTarget).not.toHaveBeenCalled();
  });

  it(`rejects deactivateAdmin self-targets before idempotency`, async () => {
    const { service, repository, idempotency } = await buildService();

    await expect(
      service.deactivateAdmin(`admin-1`, `admin-1`, { version: 1, confirmed: true }, { idempotencyKey: `idem-self` }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(idempotency.executeInTransaction).not.toHaveBeenCalled();
    expect(repository.getAdminLifecycleTarget).not.toHaveBeenCalled();
  });

  it(`rejects deactivateAdmin when version is invalid before idempotency`, async () => {
    const { service, repository, idempotency } = await buildService();

    await expect(
      service.deactivateAdmin(
        `admin-2`,
        `admin-1`,
        { version: 0, confirmed: true },
        { idempotencyKey: `idem-invalid-version` },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(idempotency.executeInTransaction).not.toHaveBeenCalled();
    expect(repository.getAdminLifecycleTarget).not.toHaveBeenCalled();
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

    const result = await service.deactivateAdmin(
      `admin-2`,
      `admin-1`,
      { version: updatedAt.getTime(), confirmed: true, reason: `Ops handoff` },
      { idempotencyKey: `idem-2`, ipAddress: `127.0.0.1`, userAgent: `jest` },
    );

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
    expect(repository.revokeActiveSessions).toHaveBeenCalledWith(expect.anything(), `admin-2`, expect.any(Date));
    expect(repository.deleteRefreshTokens).toHaveBeenCalledWith(expect.anything(), `admin-2`);
    expect(repository.createAuditEntry).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        adminId: `admin-1`,
        action: `admin_deactivate`,
        resource: `admin`,
        resourceId: `admin-2`,
        metadata: {
          targetEmail: `ops@example.com`,
          confirmed: true,
          reason: `Ops handoff`,
        },
        ipAddress: `127.0.0.1`,
        userAgent: `jest`,
      }),
    );
    expect(repository.revokeActiveSessions.mock.invocationCallOrder[0]).toBeLessThan(
      repository.deleteRefreshTokens.mock.invocationCallOrder[0],
    );
    expect(repository.deleteRefreshTokens.mock.invocationCallOrder[0]).toBeLessThan(
      repository.createAuditEntry.mock.invocationCallOrder[0],
    );
    expect(result).toEqual({
      adminId: `admin-2`,
      status: `INACTIVE`,
      deletedAt: new Date(`2026-04-17T10:05:00.000Z`).toISOString(),
      version: new Date(`2026-04-17T10:05:00.000Z`).getTime(),
      alreadyInactive: false,
    });
  });

  it(`surfaces stale deactivateAdmin conflicts from the count=0 fallback lookup without side effects`, async () => {
    const { service, repository } = await buildService();
    const target = buildLifecycleTarget();
    const currentUpdatedAt = new Date(`2026-04-17T10:06:00.000Z`);
    repository.getAdminLifecycleTarget.mockResolvedValueOnce(target);
    repository.deactivateAdmin.mockResolvedValueOnce({ count: 0 });
    repository.findAdminUpdatedAt.mockResolvedValueOnce({ updatedAt: currentUpdatedAt });

    await expect(
      service.deactivateAdmin(
        `admin-2`,
        `admin-1`,
        { version: target.updatedAt.getTime(), confirmed: true, reason: `Ops handoff` },
        { idempotencyKey: `idem-stale` },
      ),
    ).rejects.toMatchObject({
      response: {
        error: `STALE_VERSION`,
        currentVersion: currentUpdatedAt.getTime(),
      },
    });

    expect(repository.revokeActiveSessions).not.toHaveBeenCalled();
    expect(repository.deleteRefreshTokens).not.toHaveBeenCalled();
    expect(repository.createAuditEntry).not.toHaveBeenCalled();
  });

  it(`rejects changeAdminRole when confirmation is missing before idempotency`, async () => {
    const { service, repository, idempotency } = await buildService();

    await expect(
      service.changeAdminRole(
        `admin-2`,
        `admin-1`,
        { version: 1, confirmed: false, roleKey: `SUPER_ADMIN` },
        { idempotencyKey: `idem-role-confirm` },
      ),
    ).rejects.toMatchObject({
      response: {
        message: `Confirmation is required for admin role change`,
        error: `Bad Request`,
        statusCode: 400,
      },
    });

    expect(idempotency.executeInTransaction).not.toHaveBeenCalled();
    expect(repository.getAdminRoleMutationTarget).not.toHaveBeenCalled();
    expect(repository.changeAdminRole).not.toHaveBeenCalled();
  });

  it(`rejects changeAdminRole when version is invalid before idempotency`, async () => {
    const { service, repository, idempotency } = await buildService();

    await expect(
      service.changeAdminRole(
        `admin-2`,
        `admin-1`,
        { version: 0, confirmed: true, roleKey: `SUPER_ADMIN` },
        { idempotencyKey: `idem-role-version` },
      ),
    ).rejects.toMatchObject({
      response: {
        message: `Valid version is required`,
        error: `Bad Request`,
        statusCode: 400,
      },
    });

    expect(idempotency.executeInTransaction).not.toHaveBeenCalled();
    expect(repository.getAdminRoleMutationTarget).not.toHaveBeenCalled();
    expect(repository.changeAdminRole).not.toHaveBeenCalled();
  });

  it(`returns alreadyApplied without writing or auditing when changeAdminRole keeps the same role`, async () => {
    const { service, repository, idempotency } = await buildService();
    const target = buildRoleTarget({
      role: { id: `role-2`, key: `SUPER_ADMIN` },
    });
    repository.getAdminRoleMutationTarget.mockResolvedValueOnce(target);

    const result = await service.changeAdminRole(
      `admin-2`,
      `admin-1`,
      { version: target.updatedAt.getTime(), confirmed: true, roleKey: `SUPER_ADMIN` },
      { idempotencyKey: `idem-role-noop` },
    );

    expect(idempotency.executeInTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: `admin-1`,
        scope: `admin-role-change:admin-2`,
        key: `idem-role-noop`,
        payload: {
          targetAdminId: `admin-2`,
          expectedVersion: target.updatedAt.getTime(),
          confirmed: true,
          nextRoleKey: `SUPER_ADMIN`,
        },
      }),
    );
    expect(repository.getRoleByKey).not.toHaveBeenCalled();
    expect(repository.changeAdminRole).not.toHaveBeenCalled();
    expect(repository.createAuditEntry).not.toHaveBeenCalled();
    expect(repository.revokeActiveSessions).not.toHaveBeenCalled();
    expect(repository.deleteRefreshTokens).not.toHaveBeenCalled();
    expect(result).toEqual({
      adminId: `admin-2`,
      roleKey: `SUPER_ADMIN`,
      version: target.updatedAt.getTime(),
      alreadyApplied: true,
    });
  });

  it(`rejects changeAdminRole for inactive targets without mutation side effects`, async () => {
    const { service, repository } = await buildService();
    const target = buildRoleTarget({
      deletedAt: new Date(`2026-04-17T10:05:00.000Z`),
    });
    repository.getAdminRoleMutationTarget.mockResolvedValueOnce(target);

    await expect(
      service.changeAdminRole(
        `admin-2`,
        `admin-1`,
        { version: target.updatedAt.getTime(), confirmed: true, roleKey: `SUPER_ADMIN` },
        { idempotencyKey: `idem-role-inactive` },
      ),
    ).rejects.toMatchObject({
      response: {
        message: `Inactive admins cannot change roles until restored`,
        error: `Conflict`,
        statusCode: 409,
      },
    });

    expect(repository.getRoleByKey).not.toHaveBeenCalled();
    expect(repository.changeAdminRole).not.toHaveBeenCalled();
    expect(repository.createAuditEntry).not.toHaveBeenCalled();
    expect(repository.revokeActiveSessions).not.toHaveBeenCalled();
    expect(repository.deleteRefreshTokens).not.toHaveBeenCalled();
  });

  it(`rejects changeAdminRole when the requested target role is unavailable`, async () => {
    const { service, repository } = await buildService();
    const target = buildRoleTarget();
    repository.getAdminRoleMutationTarget.mockResolvedValueOnce(target);
    repository.getRoleByKey.mockResolvedValueOnce(null);

    await expect(
      service.changeAdminRole(
        `admin-2`,
        `admin-1`,
        { version: target.updatedAt.getTime(), confirmed: true, roleKey: `SUPER_ADMIN` },
        { idempotencyKey: `idem-role-missing` },
      ),
    ).rejects.toMatchObject({
      response: {
        message: `Target role is unavailable`,
        error: `Bad Request`,
        statusCode: 400,
      },
    });

    expect(repository.changeAdminRole).not.toHaveBeenCalled();
    expect(repository.createAuditEntry).not.toHaveBeenCalled();
    expect(repository.findAdminRoleResult).not.toHaveBeenCalled();
    expect(repository.revokeActiveSessions).not.toHaveBeenCalled();
    expect(repository.deleteRefreshTokens).not.toHaveBeenCalled();
  });

  it(`changes roles through idempotency, repository mutation, and audit persistence`, async () => {
    const { service, repository, idempotency } = await buildService();
    const target = buildRoleTarget();
    const nextRole = { id: `role-2`, key: `SUPER_ADMIN` };
    const freshUpdatedAt = new Date(`2026-04-17T10:10:00.000Z`);
    repository.getAdminRoleMutationTarget.mockResolvedValueOnce(target);
    repository.getRoleByKey.mockResolvedValueOnce(nextRole);
    repository.changeAdminRole.mockResolvedValueOnce({ count: 1 });
    repository.findAdminRoleResult.mockResolvedValueOnce({
      updatedAt: freshUpdatedAt,
      role: { id: `role-2`, key: `SUPER_ADMIN` },
    });

    const result = await service.changeAdminRole(
      `admin-2`,
      `admin-1`,
      { version: target.updatedAt.getTime(), confirmed: true, roleKey: ` SUPER_ADMIN ` },
      { idempotencyKey: `idem-role-ok`, ipAddress: `127.0.0.1`, userAgent: `jest` },
    );

    expect(idempotency.executeInTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: `admin-1`,
        scope: `admin-role-change:admin-2`,
        key: `idem-role-ok`,
        payload: {
          targetAdminId: `admin-2`,
          expectedVersion: target.updatedAt.getTime(),
          confirmed: true,
          nextRoleKey: `SUPER_ADMIN`,
        },
      }),
    );
    expect(repository.getRoleByKey).toHaveBeenCalledWith(`SUPER_ADMIN`);
    expect(repository.changeAdminRole).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        targetId: `admin-2`,
        expectedUpdatedAt: target.updatedAt,
        nextRoleId: `role-2`,
        nextType: `SUPER`,
      }),
    );
    expect(repository.createAuditEntry).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        adminId: `admin-1`,
        action: `admin_role_change`,
        resource: `admin`,
        resourceId: `admin-2`,
        metadata: {
          targetEmail: `ops@example.com`,
          confirmed: true,
          previousRoleKey: `OPS_ADMIN`,
          nextRoleKey: `SUPER_ADMIN`,
          previousType: `ADMIN`,
          nextType: `SUPER`,
        },
        ipAddress: `127.0.0.1`,
        userAgent: `jest`,
      }),
    );
    expect(repository.revokeActiveSessions).not.toHaveBeenCalled();
    expect(repository.deleteRefreshTokens).not.toHaveBeenCalled();
    expect(repository.getRoleByKey.mock.invocationCallOrder[0]).toBeLessThan(
      repository.changeAdminRole.mock.invocationCallOrder[0],
    );
    expect(repository.changeAdminRole.mock.invocationCallOrder[0]).toBeLessThan(
      repository.createAuditEntry.mock.invocationCallOrder[0],
    );
    expect(repository.createAuditEntry.mock.invocationCallOrder[0]).toBeLessThan(
      repository.findAdminRoleResult.mock.invocationCallOrder[0],
    );
    expect(result).toEqual({
      adminId: `admin-2`,
      roleKey: `SUPER_ADMIN`,
      version: freshUpdatedAt.getTime(),
      alreadyApplied: false,
    });
  });

  it(`surfaces stale changeAdminRole conflicts from the count=0 fallback lookup without auditing`, async () => {
    const { service, repository } = await buildService();
    const target = buildRoleTarget();
    const currentUpdatedAt = new Date(`2026-04-17T10:06:00.000Z`);
    repository.getAdminRoleMutationTarget.mockResolvedValueOnce(target);
    repository.getRoleByKey.mockResolvedValueOnce({ id: `role-2`, key: `SUPER_ADMIN` });
    repository.changeAdminRole.mockResolvedValueOnce({ count: 0 });
    repository.findAdminUpdatedAt.mockResolvedValueOnce({ updatedAt: currentUpdatedAt });

    await expect(
      service.changeAdminRole(
        `admin-2`,
        `admin-1`,
        { version: target.updatedAt.getTime(), confirmed: true, roleKey: `SUPER_ADMIN` },
        { idempotencyKey: `idem-role-stale` },
      ),
    ).rejects.toMatchObject({
      response: {
        error: `STALE_VERSION`,
        currentVersion: currentUpdatedAt.getTime(),
      },
    });

    expect(repository.createAuditEntry).not.toHaveBeenCalled();
    expect(repository.findAdminRoleResult).not.toHaveBeenCalled();
    expect(repository.revokeActiveSessions).not.toHaveBeenCalled();
    expect(repository.deleteRefreshTokens).not.toHaveBeenCalled();
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
