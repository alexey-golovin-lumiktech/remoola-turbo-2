import { type Prisma } from '@remoola/database-2';

import { AdminV2AdminAuditTrail } from './admin-v2-admin-audit-trail';
import { type AdminV2AdminAuditTrailRepository } from './admin-v2-admin-audit-trail.repository';

describe(`AdminV2AdminAuditTrail`, () => {
  function makeAuditTrail() {
    const repository = {
      updateNotificationStatus: jest.fn(async () => null),
      createAdminAuditEntry: jest.fn(async () => null),
    };
    const mailingService = {
      sendAdminV2PasswordResetEmail: jest.fn(async () => true),
      sendInvitationEmail: jest.fn(async () => undefined),
    };
    const links = {
      buildPasswordResetUrl: jest.fn((token: string) => `https://admin.test/reset?token=${token}`),
    };

    return {
      repository,
      mailingService,
      links,
      auditTrail: new AdminV2AdminAuditTrail(
        repository as unknown as AdminV2AdminAuditTrailRepository,
        mailingService as never,
        mailingService as never,
        links as never,
      ),
    };
  }

  it(`sends the reset email and persists notification status metadata`, async () => {
    const { auditTrail, repository, mailingService, links } = makeAuditTrail();

    const result = await auditTrail.sendAdminV2PasswordResetEmail({
      email: `admin@example.com`,
      token: `reset-token`,
      auditId: `audit-1`,
      metadata: { targetEmail: `admin@example.com` } satisfies Prisma.InputJsonValue,
    });

    expect(result).toEqual({
      notificationSent: true,
      deliveryStatus: `sent`,
    });
    expect(mailingService.sendAdminV2PasswordResetEmail).toHaveBeenCalledWith({
      email: `admin@example.com`,
      forgotPasswordLink: `https://admin.test/reset?token=reset-token`,
    });
    expect(links.buildPasswordResetUrl).toHaveBeenCalledWith(`reset-token`);
    expect(repository.updateNotificationStatus).toHaveBeenCalledWith({
      auditId: `audit-1`,
      metadata: {
        targetEmail: `admin@example.com`,
        notificationSent: true,
        notificationType: `email`,
        deliveryStatus: `sent`,
      },
    });
  });

  it(`records admin audit entries through the repository`, async () => {
    const { auditTrail, repository } = makeAuditTrail();

    await auditTrail.recordAdminActionAudit({
      adminId: `admin-1`,
      action: `admin_restore`,
      resourceId: `admin-2`,
      metadata: { previousState: `deleted` } satisfies Prisma.InputJsonValue,
      ipAddress: `127.0.0.1`,
      userAgent: `jest`,
    });

    expect(repository.createAdminAuditEntry).toHaveBeenCalledWith({
      adminId: `admin-1`,
      action: `admin_restore`,
      resourceId: `admin-2`,
      metadata: { previousState: `deleted` },
      ipAddress: `127.0.0.1`,
      userAgent: `jest`,
    });
  });

  it(`logs a warning instead of throwing when audit persistence fails`, async () => {
    const { auditTrail, repository } = makeAuditTrail();
    const warnSpy = jest.spyOn((auditTrail as any).logger, `warn`).mockImplementation(() => undefined);
    repository.createAdminAuditEntry.mockRejectedValueOnce(new Error(`db unavailable`));

    await expect(
      auditTrail.recordAdminActionAudit({
        adminId: `admin-1`,
        action: `admin_restore`,
        resourceId: `admin-2`,
      }),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(`Failed to record admin compatibility audit`));
  });
});
