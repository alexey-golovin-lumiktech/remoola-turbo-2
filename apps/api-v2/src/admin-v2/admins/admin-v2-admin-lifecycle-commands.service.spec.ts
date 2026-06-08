import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ConflictException } from '@nestjs/common';

import { type AdminV2AdminAuditTrail } from './admin-v2-admin-audit-trail';
import { AdminV2AdminLifecycleCommandsService } from './admin-v2-admin-lifecycle-commands.service';
import { type AdminV2AdminMutationsRepository } from './admin-v2-admin-mutations.repository';
import { type AdminV2IdempotencyService } from '../admin-v2-idempotency.service';

describe(`AdminV2AdminLifecycleCommandsService`, () => {
  function buildService() {
    const repository = {
      updateAdminStatus: jest.fn<(...a: any[]) => any>(),
      getAdminLifecycleTarget: jest.fn<(...a: any[]) => any>(),
      deactivateAdmin: jest.fn<(...a: any[]) => any>(),
      findAdminUpdatedAt: jest.fn<(...a: any[]) => any>(),
      revokeActiveSessions: jest.fn<(...a: any[]) => any>(),
      deleteRefreshTokens: jest.fn<(...a: any[]) => any>(),
      createAuditEntry: jest.fn<(...a: any[]) => any>(),
      findAdminLifecycleResult: jest.fn<(...a: any[]) => any>(),
      restoreAdmin: jest.fn<(...a: any[]) => any>(),
    };
    const idempotency = {
      executeInTransaction: jest.fn<(...a: any[]) => any>(
        async ({ execute }: { execute: (tx: unknown) => Promise<unknown> }) => execute({ tx: true }),
      ),
    };
    const auditTrail = {
      recordAdminActionAudit: jest.fn<(...a: any[]) => any>(async () => undefined),
    };

    return {
      service: new AdminV2AdminLifecycleCommandsService(
        repository as unknown as AdminV2AdminMutationsRepository,
        idempotency as unknown as AdminV2IdempotencyService,
        auditTrail as unknown as AdminV2AdminAuditTrail,
      ),
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
      const { service, repository, auditTrail, idempotency } = buildService();
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
      } as any);

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
    const { service, repository, idempotency } = buildService();

    await expect(
      service.restoreAdmin(`admin-2`, `admin-1`, { version: 0 }, { idempotencyKey: `idem-restore-invalid` } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(idempotency.executeInTransaction).not.toHaveBeenCalled();
    expect(repository.getAdminLifecycleTarget).not.toHaveBeenCalled();
  });

  it(`returns alreadyActive without restoring or auditing when restoreAdmin targets an active admin`, async () => {
    const { service, repository } = buildService();
    const target = buildLifecycleTarget();
    repository.getAdminLifecycleTarget.mockResolvedValueOnce(target);

    const result = await service.restoreAdmin(`admin-2`, `admin-1`, { version: target.updatedAt.getTime() }, {
      idempotencyKey: `idem-restore-noop`,
      ipAddress: `127.0.0.1`,
      userAgent: `jest`,
    } as any);

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
    const { service, repository, idempotency } = buildService();
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

    const result = await service.restoreAdmin(`admin-2`, `admin-1`, { version: target.updatedAt.getTime() }, {
      idempotencyKey: `idem-restore-ok`,
      ipAddress: `127.0.0.1`,
      userAgent: `jest`,
    } as any);

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
    const { service, repository } = buildService();
    const target = buildLifecycleTarget({
      deletedAt: new Date(`2026-04-17T10:05:00.000Z`),
    });
    const currentUpdatedAt = new Date(`2026-04-17T10:07:00.000Z`);
    repository.getAdminLifecycleTarget.mockResolvedValueOnce(target);
    repository.restoreAdmin.mockResolvedValueOnce({ count: 0 });
    repository.findAdminUpdatedAt.mockResolvedValueOnce({ updatedAt: currentUpdatedAt });

    await expect(
      service.restoreAdmin(`admin-2`, `admin-1`, { version: target.updatedAt.getTime() }, {
        idempotencyKey: `idem-restore-stale`,
      } as any),
    ).rejects.toMatchObject({
      response: {
        error: `STALE_VERSION`,
        currentVersion: currentUpdatedAt.getTime(),
      },
    });

    expect(repository.findAdminLifecycleResult).not.toHaveBeenCalled();
  });

  it(`returns alreadyInactive without opening a transaction`, async () => {
    const { service, repository } = buildService();
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
      { idempotencyKey: `idem-1` } as any,
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
    const { service, repository, idempotency } = buildService();

    await expect(
      service.deactivateAdmin(`admin-2`, `admin-1`, { version: 1, confirmed: false }, {
        idempotencyKey: `idem-a`,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(idempotency.executeInTransaction).not.toHaveBeenCalled();
    expect(repository.getAdminLifecycleTarget).not.toHaveBeenCalled();
  });

  it(`rejects deactivateAdmin self-targets before idempotency`, async () => {
    const { service, repository, idempotency } = buildService();

    await expect(
      service.deactivateAdmin(`admin-1`, `admin-1`, { version: 1, confirmed: true }, {
        idempotencyKey: `idem-self`,
      } as any),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(idempotency.executeInTransaction).not.toHaveBeenCalled();
    expect(repository.getAdminLifecycleTarget).not.toHaveBeenCalled();
  });

  it(`rejects deactivateAdmin when version is invalid before idempotency`, async () => {
    const { service, repository, idempotency } = buildService();

    await expect(
      service.deactivateAdmin(`admin-2`, `admin-1`, { version: 0, confirmed: true }, {
        idempotencyKey: `idem-invalid-version`,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(idempotency.executeInTransaction).not.toHaveBeenCalled();
    expect(repository.getAdminLifecycleTarget).not.toHaveBeenCalled();
  });

  it(`routes deactivation through idempotency and the transaction runner`, async () => {
    const { service, repository, idempotency } = buildService();
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
      { idempotencyKey: `idem-2`, ipAddress: `127.0.0.1`, userAgent: `jest` } as any,
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
    const { service, repository } = buildService();
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
        { idempotencyKey: `idem-stale` } as any,
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
});
