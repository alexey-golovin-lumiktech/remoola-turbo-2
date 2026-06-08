import { describe, expect, it, jest } from '@jest/globals';

import { type AdminV2AdminAuditTrail } from './admin-v2-admin-audit-trail';
import { AdminV2AdminCredentialsCommandsService } from './admin-v2-admin-credentials-commands.service';
import { type AdminV2AdminMutationsRepository } from './admin-v2-admin-mutations.repository';

describe(`AdminV2AdminCredentialsCommandsService`, () => {
  function buildService() {
    const repository = {
      patchAdminPassword: jest.fn<(...a: any[]) => any>(),
    };
    const auditTrail = {
      recordAdminActionAudit: jest.fn<(...a: any[]) => any>(async () => undefined),
    };

    return {
      service: new AdminV2AdminCredentialsCommandsService(
        repository as unknown as AdminV2AdminMutationsRepository,
        auditTrail as unknown as AdminV2AdminAuditTrail,
      ),
      repository,
      auditTrail,
    };
  }

  it(`records compatibility audit after patching an admin password through the repository`, async () => {
    const { service, repository, auditTrail } = buildService();
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
    } as any);

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
});
