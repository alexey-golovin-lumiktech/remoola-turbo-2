import { AdminV2AdminPasswordFlowsRepository } from './admin-v2-admin-password-flows.repository';

describe(`AdminV2AdminPasswordFlowsRepository`, () => {
  function buildRepository() {
    const adminModel = {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    };
    const adminActionAuditLogModel = {
      update: jest.fn(),
    };
    const resetPasswordModel = {
      findFirst: jest.fn(),
    };
    type TxMock = {
      resetPasswordModel: {
        updateMany: jest.Mock;
        create: jest.Mock;
      };
      adminActionAuditLogModel: {
        create: jest.Mock;
      };
      adminModel: {
        update: jest.Mock;
      };
      adminAuthSessionModel: {
        updateMany: jest.Mock;
      };
      accessRefreshTokenModel: {
        deleteMany: jest.Mock;
      };
    };
    const tx: TxMock = {
      resetPasswordModel: {
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      adminActionAuditLogModel: {
        create: jest.fn(),
      },
      adminModel: {
        update: jest.fn(),
      },
      adminAuthSessionModel: {
        updateMany: jest.fn(),
      },
      accessRefreshTokenModel: {
        deleteMany: jest.fn(),
      },
    };
    const prisma = {
      adminModel,
      adminActionAuditLogModel,
      resetPasswordModel,
      $transaction: jest.fn(async (callback: (tx: TxMock) => Promise<unknown>) => callback(tx)),
    };

    return {
      repository: new AdminV2AdminPasswordFlowsRepository(
        prisma as never,
        { run: (callback: (tx: unknown) => Promise<unknown>) => prisma.$transaction(callback as never) } as never,
      ),
      adminModel,
      adminActionAuditLogModel,
      resetPasswordModel,
      tx,
    };
  }

  it(`creates reset artifacts and a pending delivery audit in one transaction`, async () => {
    const { repository, tx } = buildRepository();
    tx.resetPasswordModel.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.resetPasswordModel.create.mockResolvedValueOnce({ id: `reset-1` });
    tx.adminActionAuditLogModel.create.mockResolvedValueOnce({ id: `audit-1` });

    await expect(
      repository.createPasswordResetArtifact({
        adminId: `admin-2`,
        auditAdminId: `admin-1`,
        email: `ops@example.com`,
        tokenHash: `token-hash`,
        expiresAt: new Date(`2026-04-17T13:00:00.000Z`),
        metadata: {
          targetEmail: `ops@example.com`,
        },
        ipAddress: `127.0.0.1`,
        userAgent: `jest`,
      }),
    ).resolves.toEqual({ auditId: `audit-1` });

    expect(tx.resetPasswordModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminId: `admin-2`,
          tokenHash: `token-hash`,
          appScope: `admin-v2`,
        }),
      }),
    );
    expect(tx.adminActionAuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: `admin_password_reset`,
          metadata: expect.objectContaining({
            targetEmail: `ops@example.com`,
            deliveryStatus: `pending`,
          }),
        }),
      }),
    );
  });

  it(`updates audit notification delivery metadata`, async () => {
    const { repository, adminActionAuditLogModel } = buildRepository();
    adminActionAuditLogModel.update.mockResolvedValueOnce(undefined);

    await repository.updateAuditNotificationStatus({
      auditId: `audit-1`,
      metadata: {
        targetEmail: `ops@example.com`,
        initiatedBy: `self_service`,
      },
      notificationSent: false,
    });

    expect(adminActionAuditLogModel.update).toHaveBeenCalledWith({
      where: { id: `audit-1` },
      data: {
        metadata: {
          targetEmail: `ops@example.com`,
          initiatedBy: `self_service`,
          notificationSent: false,
          notificationType: `email`,
          deliveryStatus: `failed`,
        },
      },
    });
  });

  it(`consumes reset tokens, updates passwords, and revokes legacy auth artifacts`, async () => {
    const { repository, tx } = buildRepository();
    tx.resetPasswordModel.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.adminModel.update.mockResolvedValueOnce({ id: `admin-2` });
    tx.adminAuthSessionModel.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.accessRefreshTokenModel.deleteMany.mockResolvedValueOnce({ count: 1 });

    await expect(
      repository.consumeResetTokenAndUpdatePassword({
        resetTokenId: `reset-1`,
        adminId: `admin-2`,
        hash: `hash`,
        salt: `salt`,
      }),
    ).resolves.toBe(true);

    expect(tx.adminModel.update).toHaveBeenCalledWith({
      where: { id: `admin-2` },
      data: { password: `hash`, salt: `salt` },
    });
    expect(tx.adminAuthSessionModel.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { adminId: `admin-2`, revokedAt: null },
      }),
    );
    expect(tx.accessRefreshTokenModel.deleteMany).toHaveBeenCalledWith({
      where: {
        identityId: `admin-2`,
      },
    });
  });

  it(`returns false when the reset token was already consumed`, async () => {
    const { repository, tx } = buildRepository();
    tx.resetPasswordModel.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      repository.consumeResetTokenAndUpdatePassword({
        resetTokenId: `reset-1`,
        adminId: `admin-2`,
        hash: `hash`,
        salt: `salt`,
      }),
    ).resolves.toBe(false);
  });
});
