import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ConflictException } from '@nestjs/common';

import { AdminV2AdminAccessCommandsService } from './admin-v2-admin-access-commands.service';
import { type AdminV2AdminMutationsRepository } from './admin-v2-admin-mutations.repository';
import { type AdminV2IdempotencyService } from '../admin-v2-idempotency.service';

describe(`AdminV2AdminAccessCommandsService`, () => {
  function buildService() {
    const repository = {
      getAdminRoleMutationTarget: jest.fn<(...a: any[]) => any>(),
      getAdminPermissionMutationTarget: jest.fn<(...a: any[]) => any>(),
      getRoleByKey: jest.fn<(...a: any[]) => any>(),
      listRelevantPermissions: jest.fn<(...a: any[]) => any>(),
      changeAdminRole: jest.fn<(...a: any[]) => any>(),
      replaceAdminPermissionOverrides: jest.fn<(...a: any[]) => any>(),
      touchAdminPermissions: jest.fn<(...a: any[]) => any>(),
      createAuditEntry: jest.fn<(...a: any[]) => any>(),
      findAdminRoleResult: jest.fn<(...a: any[]) => any>(),
      findAdminPermissionResult: jest.fn<(...a: any[]) => any>(),
      findAdminUpdatedAt: jest.fn<(...a: any[]) => any>(),
      revokeActiveSessions: jest.fn<(...a: any[]) => any>(),
      deleteRefreshTokens: jest.fn<(...a: any[]) => any>(),
    };
    const idempotency = {
      executeInTransaction: jest.fn<(...a: any[]) => any>(
        async ({ execute }: { execute: (tx: unknown) => Promise<unknown> }) => execute({ tx: true }),
      ),
    };

    return {
      service: new AdminV2AdminAccessCommandsService(
        repository as unknown as AdminV2AdminMutationsRepository,
        idempotency as unknown as AdminV2IdempotencyService,
      ),
      repository,
      idempotency,
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

  function buildPermissionTarget(overrides: Record<string, unknown> = {}) {
    return {
      ...buildLifecycleTarget(),
      permissionOverrides: [],
      ...overrides,
    };
  }

  it(`rejects changeAdminRole when confirmation is missing before idempotency`, async () => {
    const { service, repository, idempotency } = buildService();

    await expect(
      service.changeAdminRole(`admin-2`, `admin-1`, { version: 1, confirmed: false, roleKey: `SUPER_ADMIN` }, {
        idempotencyKey: `idem-role-confirm`,
      } as any),
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
    const { service, repository, idempotency } = buildService();

    await expect(
      service.changeAdminRole(`admin-2`, `admin-1`, { version: 0, confirmed: true, roleKey: `SUPER_ADMIN` }, {
        idempotencyKey: `idem-role-version`,
      } as any),
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
    const { service, repository, idempotency } = buildService();
    const target = buildRoleTarget({
      role: { id: `role-2`, key: `SUPER_ADMIN` },
    });
    repository.getAdminRoleMutationTarget.mockResolvedValueOnce(target);

    const result = await service.changeAdminRole(
      `admin-2`,
      `admin-1`,
      { version: target.updatedAt.getTime(), confirmed: true, roleKey: `SUPER_ADMIN` },
      { idempotencyKey: `idem-role-noop` } as any,
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
    const { service, repository } = buildService();
    const target = buildRoleTarget({
      deletedAt: new Date(`2026-04-17T10:05:00.000Z`),
    });
    repository.getAdminRoleMutationTarget.mockResolvedValueOnce(target);

    await expect(
      service.changeAdminRole(
        `admin-2`,
        `admin-1`,
        { version: target.updatedAt.getTime(), confirmed: true, roleKey: `SUPER_ADMIN` },
        { idempotencyKey: `idem-role-inactive` } as any,
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
    const { service, repository } = buildService();
    const target = buildRoleTarget();
    repository.getAdminRoleMutationTarget.mockResolvedValueOnce(target);
    repository.getRoleByKey.mockResolvedValueOnce(null);

    await expect(
      service.changeAdminRole(
        `admin-2`,
        `admin-1`,
        { version: target.updatedAt.getTime(), confirmed: true, roleKey: `SUPER_ADMIN` },
        { idempotencyKey: `idem-role-missing` } as any,
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
    const { service, repository, idempotency } = buildService();
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
      { idempotencyKey: `idem-role-ok`, ipAddress: `127.0.0.1`, userAgent: `jest` } as any,
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
    const { service, repository } = buildService();
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
        { idempotencyKey: `idem-role-stale` } as any,
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
    const { service, repository, idempotency } = buildService();

    await expect(
      service.changeAdminPermissions(
        `admin-2`,
        `admin-1`,
        {
          version: 1,
          capabilityOverrides: [{ capability: `me.read`, mode: `grant` }],
        },
        { idempotencyKey: `idem-3` } as any,
      ),
    ).rejects.toMatchObject({
      response: {
        message: `Only known admin-v2 capability overrides are supported`,
        error: `Bad Request`,
        statusCode: 400,
      },
    });

    expect(idempotency.executeInTransaction).not.toHaveBeenCalled();
    expect(repository.getAdminPermissionMutationTarget).not.toHaveBeenCalled();
    expect(repository.replaceAdminPermissionOverrides).not.toHaveBeenCalled();
    expect(repository.createAuditEntry).not.toHaveBeenCalled();
  });

  it(`rejects changeAdminPermissions when version is invalid before idempotency`, async () => {
    const { service, repository, idempotency } = buildService();

    await expect(
      service.changeAdminPermissions(
        `admin-2`,
        `admin-1`,
        {
          version: 0,
          capabilityOverrides: [{ capability: `admins.manage`, mode: `grant` }],
        },
        { idempotencyKey: `idem-permissions-version` } as any,
      ),
    ).rejects.toMatchObject({
      response: {
        message: `Valid version is required`,
        error: `Bad Request`,
        statusCode: 400,
      },
    });

    expect(idempotency.executeInTransaction).not.toHaveBeenCalled();
    expect(repository.getAdminPermissionMutationTarget).not.toHaveBeenCalled();
    expect(repository.replaceAdminPermissionOverrides).not.toHaveBeenCalled();
    expect(repository.createAuditEntry).not.toHaveBeenCalled();
  });

  it(`returns alreadyApplied when capability overrides do not change the effective state`, async () => {
    const { service, repository, idempotency } = buildService();
    const target = buildPermissionTarget({
      permissionOverrides: [
        {
          id: `override-1`,
          granted: true,
          permissionId: `perm-1`,
          permission: { capability: `admins.manage` },
        },
      ],
    });
    repository.getAdminPermissionMutationTarget.mockResolvedValueOnce(target);
    repository.listRelevantPermissions.mockResolvedValueOnce([{ id: `perm-1`, capability: `admins.manage` }]);

    const result = await service.changeAdminPermissions(
      `admin-2`,
      `admin-1`,
      {
        version: target.updatedAt.getTime(),
        capabilityOverrides: [{ capability: ` admins.manage `, mode: ` grant ` }],
      },
      { idempotencyKey: `idem-4` } as any,
    );

    expect(idempotency.executeInTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: `admin-1`,
        scope: `admin-permissions-change:admin-2`,
        key: `idem-4`,
        payload: {
          targetAdminId: `admin-2`,
          expectedVersion: target.updatedAt.getTime(),
          normalizedOverrides: [{ capability: `admins.manage`, mode: `grant` }],
        },
      }),
    );
    expect(repository.replaceAdminPermissionOverrides).not.toHaveBeenCalled();
    expect(repository.touchAdminPermissions).not.toHaveBeenCalled();
    expect(repository.createAuditEntry).not.toHaveBeenCalled();
    expect(repository.revokeActiveSessions).not.toHaveBeenCalled();
    expect(repository.deleteRefreshTokens).not.toHaveBeenCalled();
    expect(result).toEqual({
      adminId: `admin-2`,
      version: target.updatedAt.getTime(),
      overrides: [{ capability: `admins.manage`, mode: `grant` }],
      alreadyApplied: true,
    });
  });

  it(`rejects changeAdminPermissions for inactive targets without mutation side effects`, async () => {
    const { service, repository } = buildService();
    const target = buildPermissionTarget({
      deletedAt: new Date(`2026-04-17T10:05:00.000Z`),
    });
    repository.getAdminPermissionMutationTarget.mockResolvedValueOnce(target);

    await expect(
      service.changeAdminPermissions(
        `admin-2`,
        `admin-1`,
        {
          version: target.updatedAt.getTime(),
          capabilityOverrides: [{ capability: `admins.manage`, mode: `grant` }],
        },
        { idempotencyKey: `idem-permissions-inactive` } as any,
      ),
    ).rejects.toMatchObject({
      response: {
        message: `Inactive admins cannot change permission overrides until restored`,
        error: `Conflict`,
        statusCode: 409,
      },
    });

    expect(repository.listRelevantPermissions).not.toHaveBeenCalled();
    expect(repository.replaceAdminPermissionOverrides).not.toHaveBeenCalled();
    expect(repository.touchAdminPermissions).not.toHaveBeenCalled();
    expect(repository.createAuditEntry).not.toHaveBeenCalled();
    expect(repository.revokeActiveSessions).not.toHaveBeenCalled();
    expect(repository.deleteRefreshTokens).not.toHaveBeenCalled();
  });

  it(`rejects changeAdminPermissions when one or more requested capabilities are unavailable`, async () => {
    const { service, repository } = buildService();
    const target = buildPermissionTarget();
    repository.getAdminPermissionMutationTarget.mockResolvedValueOnce(target);
    repository.listRelevantPermissions.mockResolvedValueOnce([{ id: `perm-1`, capability: `admins.manage` }]);

    await expect(
      service.changeAdminPermissions(
        `admin-2`,
        `admin-1`,
        {
          version: target.updatedAt.getTime(),
          capabilityOverrides: [
            { capability: `admins.manage`, mode: `grant` },
            { capability: `verification.read`, mode: `grant` },
          ],
        },
        { idempotencyKey: `idem-permissions-unavailable` } as any,
      ),
    ).rejects.toMatchObject({
      response: {
        message: `One or more requested capabilities are unavailable`,
        error: `Bad Request`,
        statusCode: 400,
      },
    });

    expect(repository.replaceAdminPermissionOverrides).not.toHaveBeenCalled();
    expect(repository.touchAdminPermissions).not.toHaveBeenCalled();
    expect(repository.createAuditEntry).not.toHaveBeenCalled();
    expect(repository.revokeActiveSessions).not.toHaveBeenCalled();
    expect(repository.deleteRefreshTokens).not.toHaveBeenCalled();
  });

  it(`changes permission overrides through idempotency, canonical diffing, and audit persistence`, async () => {
    const { service, repository, idempotency } = buildService();
    const target = buildPermissionTarget({
      permissionOverrides: [
        {
          id: `override-admins-manage`,
          granted: true,
          permissionId: `perm-admins-manage`,
          permission: { capability: `admins.manage` },
        },
        {
          id: `override-me-read`,
          granted: true,
          permissionId: `perm-me-read`,
          permission: { capability: `me.read` },
        },
      ],
    });
    const freshUpdatedAt = new Date(`2026-04-17T10:10:00.000Z`);
    repository.getAdminPermissionMutationTarget.mockResolvedValueOnce(target);
    repository.listRelevantPermissions.mockResolvedValueOnce([
      { id: `perm-admins-manage`, capability: `admins.manage` },
      { id: `perm-verification-read`, capability: `verification.read` },
    ]);
    repository.touchAdminPermissions.mockResolvedValueOnce({ count: 1 });
    repository.findAdminPermissionResult.mockResolvedValueOnce({
      updatedAt: freshUpdatedAt,
      permissionOverrides: [
        {
          id: `fresh-verification-read`,
          granted: true,
          permissionId: `perm-verification-read`,
          permission: { capability: `verification.read` },
        },
        {
          id: `fresh-admins-manage`,
          granted: false,
          permissionId: `perm-admins-manage`,
          permission: { capability: `admins.manage` },
        },
        {
          id: `fresh-me-read`,
          granted: true,
          permissionId: `perm-me-read`,
          permission: { capability: `me.read` },
        },
      ],
    });

    const result = await service.changeAdminPermissions(
      `admin-2`,
      `admin-1`,
      {
        version: target.updatedAt.getTime(),
        capabilityOverrides: [
          { capability: ` admins.manage `, mode: ` deny ` },
          { capability: ` verification.read `, mode: ` grant ` },
        ],
      },
      { idempotencyKey: `idem-permissions-ok`, ipAddress: `127.0.0.1`, userAgent: `jest` } as any,
    );

    expect(idempotency.executeInTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: `admin-1`,
        scope: `admin-permissions-change:admin-2`,
        key: `idem-permissions-ok`,
        payload: {
          targetAdminId: `admin-2`,
          expectedVersion: target.updatedAt.getTime(),
          normalizedOverrides: [
            { capability: `admins.manage`, mode: `deny` },
            { capability: `verification.read`, mode: `grant` },
          ],
        },
      }),
    );
    expect(repository.listRelevantPermissions).toHaveBeenCalledWith(
      expect.arrayContaining([`admins.manage`, `verification.read`]),
    );

    const replaceArgs = repository.replaceAdminPermissionOverrides.mock.calls[0]?.[1];
    expect(replaceArgs).toEqual(
      expect.objectContaining({
        adminId: `admin-2`,
        normalizedOverrides: [
          { capability: `admins.manage`, mode: `deny` },
          { capability: `verification.read`, mode: `grant` },
        ],
        touchedPermissionIds: [`perm-admins-manage`, `perm-verification-read`],
      }),
    );
    expect([...replaceArgs.permissionIdByCapability.entries()]).toEqual([
      [`admins.manage`, `perm-admins-manage`],
      [`verification.read`, `perm-verification-read`],
    ]);

    expect(repository.touchAdminPermissions).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        targetId: `admin-2`,
        expectedUpdatedAt: target.updatedAt,
        updatedAt: expect.any(Date),
      }),
    );
    expect(repository.createAuditEntry).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        adminId: `admin-1`,
        action: `admin_permissions_change`,
        resource: `admin`,
        resourceId: `admin-2`,
        metadata: {
          targetEmail: `ops@example.com`,
          changes: [
            { capability: `verification.read`, previous: null, next: true },
            { capability: `admins.manage`, previous: true, next: false },
          ],
        },
        ipAddress: `127.0.0.1`,
        userAgent: `jest`,
      }),
    );
    expect(repository.revokeActiveSessions).not.toHaveBeenCalled();
    expect(repository.deleteRefreshTokens).not.toHaveBeenCalled();
    expect(repository.replaceAdminPermissionOverrides.mock.invocationCallOrder[0]).toBeLessThan(
      repository.touchAdminPermissions.mock.invocationCallOrder[0],
    );
    expect(repository.touchAdminPermissions.mock.invocationCallOrder[0]).toBeLessThan(
      repository.createAuditEntry.mock.invocationCallOrder[0],
    );
    expect(repository.createAuditEntry.mock.invocationCallOrder[0]).toBeLessThan(
      repository.findAdminPermissionResult.mock.invocationCallOrder[0],
    );
    expect(result).toEqual({
      adminId: `admin-2`,
      version: freshUpdatedAt.getTime(),
      overrides: [
        { capability: `verification.read`, granted: true },
        { capability: `admins.manage`, granted: false },
      ],
      alreadyApplied: false,
    });
  });

  it(`surfaces stale changeAdminPermissions conflicts from the touch fallback without auditing`, async () => {
    const { service, repository } = buildService();
    const target = buildPermissionTarget();
    const currentUpdatedAt = new Date(`2026-04-17T10:06:00.000Z`);
    repository.getAdminPermissionMutationTarget.mockResolvedValueOnce(target);
    repository.listRelevantPermissions.mockResolvedValueOnce([{ id: `perm-1`, capability: `admins.manage` }]);
    repository.touchAdminPermissions.mockResolvedValueOnce({ count: 0 });
    repository.findAdminUpdatedAt.mockResolvedValueOnce({ updatedAt: currentUpdatedAt });

    await expect(
      service.changeAdminPermissions(
        `admin-2`,
        `admin-1`,
        {
          version: target.updatedAt.getTime(),
          capabilityOverrides: [{ capability: `admins.manage`, mode: `grant` }],
        },
        { idempotencyKey: `idem-permissions-stale` } as any,
      ),
    ).rejects.toMatchObject({
      response: {
        error: `STALE_VERSION`,
        currentVersion: currentUpdatedAt.getTime(),
      },
    });

    expect(repository.replaceAdminPermissionOverrides).toHaveBeenCalled();
    expect(repository.createAuditEntry).not.toHaveBeenCalled();
    expect(repository.findAdminPermissionResult).not.toHaveBeenCalled();
    expect(repository.revokeActiveSessions).not.toHaveBeenCalled();
    expect(repository.deleteRefreshTokens).not.toHaveBeenCalled();
  });

  it(`bubbles up stale version conflicts before delegation`, async () => {
    const { service, repository } = buildService();
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
        { idempotencyKey: `idem-5` } as any,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(repository.changeAdminRole).not.toHaveBeenCalled();
  });
});
