import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ConflictException } from '@nestjs/common';

import { AdminV2AdminPasswordFlowsService } from './admin-v2-admin-password-flows.service';
import { AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';

describe(`AdminV2AdminPasswordFlowsService`, () => {
  function buildService() {
    const repository = {
      getActiveAdminByEmail: jest.fn<(...a: any[]) => any>(),
      getResetTarget: jest.fn<(...a: any[]) => any>(),
      createPasswordResetArtifact: jest.fn<(...a: any[]) => any>(),
      updateAuditNotificationStatus: jest.fn<(...a: any[]) => any>(),
      getResetToken: jest.fn<(...a: any[]) => any>(),
      getActiveAdminById: jest.fn<(...a: any[]) => any>(),
      consumeResetTokenAndUpdatePassword: jest.fn<(...a: any[]) => any>(),
    };
    const idempotency = {
      execute: jest.fn<(...a: any[]) => any>(async ({ execute }: { execute: () => Promise<unknown> }) => execute()),
    };
    const auditTrail = {
      sendAdminV2PasswordResetEmailNotification: jest.fn<(...a: any[]) => any>(async () => true),
    };
    const authAudit = {
      clearLockout: jest.fn<(...a: any[]) => any>(async () => undefined),
    };

    return {
      service: new AdminV2AdminPasswordFlowsService(
        repository as never,
        idempotency as never,
        auditTrail as never,
        authAudit as never,
      ),
      repository,
      idempotency,
      auditTrail,
      authAudit,
    };
  }

  it(`requestPasswordReset stays generic for unknown admins`, async () => {
    const { service, repository, auditTrail } = buildService();
    repository.getActiveAdminByEmail.mockResolvedValueOnce(null);

    await expect(service.requestPasswordReset({ email: `missing@example.com` })).resolves.toBeUndefined();

    expect(auditTrail.sendAdminV2PasswordResetEmailNotification).not.toHaveBeenCalled();
  });

  it(`requestPasswordReset persists reset state before updating notification delivery`, async () => {
    const { service, repository, auditTrail } = buildService();
    repository.getActiveAdminByEmail.mockResolvedValueOnce({
      id: `admin-2`,
      email: `ops@example.com`,
    });
    repository.createPasswordResetArtifact.mockResolvedValueOnce({ auditId: `audit-1` });
    auditTrail.sendAdminV2PasswordResetEmailNotification.mockResolvedValueOnce(false);

    await expect(service.requestPasswordReset({ email: `ops@example.com` })).resolves.toBeUndefined();

    expect(repository.createPasswordResetArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: `admin-2`,
        auditAdminId: `admin-2`,
        email: `ops@example.com`,
        tokenHash: expect.any(String),
      }),
    );
    expect(repository.updateAuditNotificationStatus).toHaveBeenCalledWith({
      auditId: `audit-1`,
      metadata: {
        targetEmail: `ops@example.com`,
        initiatedBy: `self_service`,
      },
      notificationSent: false,
    });
  });

  it(`resetAdminPassword records notification outcome after repository persistence`, async () => {
    const { service, repository, idempotency } = buildService();
    const updatedAt = new Date(`2026-04-17T12:00:00.000Z`);
    repository.getResetTarget.mockResolvedValueOnce({
      id: `admin-2`,
      email: `ops@example.com`,
      updatedAt,
      deletedAt: null,
    });
    repository.createPasswordResetArtifact.mockResolvedValueOnce({ auditId: `audit-2` });

    const result = await service.resetAdminPassword(
      `admin-2`,
      `admin-1`,
      { version: updatedAt.getTime() },
      { idempotencyKey: `idem-1`, ipAddress: `127.0.0.1`, userAgent: `jest` },
    );

    expect(idempotency.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: `admin-1`,
        scope: `admin-password-reset:admin-2`,
        key: `idem-1`,
      }),
    );
    expect(repository.createPasswordResetArtifact).toHaveBeenCalled();
    expect(result).toEqual({
      adminId: `admin-2`,
      email: `ops@example.com`,
      version: updatedAt.getTime(),
      notificationSent: true,
      deliveryStatus: `sent`,
    });
  });

  it(`rejects reset requests for inactive admins`, async () => {
    const { service, repository } = buildService();
    repository.getResetTarget.mockResolvedValueOnce({
      id: `admin-2`,
      email: `ops@example.com`,
      updatedAt: new Date(`2026-04-17T12:00:00.000Z`),
      deletedAt: new Date(`2026-04-17T12:01:00.000Z`),
    });

    await expect(
      service.resetAdminPassword(`admin-2`, `admin-1`, { version: new Date(`2026-04-17T12:00:00.000Z`).getTime() }, {}),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it(`resetPasswordWithToken clears auth lockout after repository consumption`, async () => {
    const { service, repository, authAudit } = buildService();
    repository.getResetToken.mockResolvedValueOnce({
      id: `reset-1`,
      adminId: `admin-2`,
    });
    repository.getActiveAdminById.mockResolvedValueOnce({
      id: `admin-2`,
      email: `invitee@example.com`,
    });
    repository.consumeResetTokenAndUpdatePassword.mockResolvedValueOnce(true);

    await expect(
      service.resetPasswordWithToken({ token: `reset-token`, password: `VerySecurePass1!` }),
    ).resolves.toMatchObject({
      success: true,
      adminId: `admin-2`,
    });
    expect(authAudit.clearLockout).toHaveBeenCalledWith(AUTH_IDENTITY_TYPES.admin, `invitee@example.com`);
  });

  it(`rejects weak passwords when resetting with a token`, async () => {
    const { service } = buildService();

    await expect(service.resetPasswordWithToken({ token: `reset-token`, password: `password` })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
