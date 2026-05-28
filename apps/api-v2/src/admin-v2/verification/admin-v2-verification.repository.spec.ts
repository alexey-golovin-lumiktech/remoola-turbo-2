import { describe, expect, it, jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { AdminV2VerificationRepository } from './admin-v2-verification.repository';

function buildRepository() {
  const consumerModel = {
    findUnique: jest.fn<(...a: any[]) => any>(),
  };
  const adminActionAuditLogModel = {
    update: jest.fn<(...a: any[]) => any>(),
  };
  type TxMock = {
    consumerModel: {
      updateMany: jest.Mock<(...a: any[]) => any>;
      findUnique: jest.Mock<(...a: any[]) => any>;
      findUniqueOrThrow: jest.Mock<(...a: any[]) => any>;
    };
    adminActionAuditLogModel: {
      create: jest.Mock<(...a: any[]) => any>;
    };
  };
  const tx: TxMock = {
    consumerModel: {
      updateMany: jest.fn<(...a: any[]) => any>(),
      findUnique: jest.fn<(...a: any[]) => any>(),
      findUniqueOrThrow: jest.fn<(...a: any[]) => any>(),
    },
    adminActionAuditLogModel: {
      create: jest.fn<(...a: any[]) => any>(),
    },
  };
  const prisma = {
    consumerModel,
    adminActionAuditLogModel,
    $transaction: jest.fn<(...a: any[]) => any>(async (callback: (tx: TxMock) => Promise<unknown>) => callback(tx)),
  };

  return {
    repository: new AdminV2VerificationRepository(
      prisma as never,
      { run: (callback: (tx: unknown) => Promise<unknown>) => prisma.$transaction(callback as never) } as never,
    ),
    prisma,
    consumerModel,
    adminActionAuditLogModel,
    tx,
  };
}

describe(`AdminV2VerificationRepository`, () => {
  it(`throws not found when the decision target consumer does not exist`, async () => {
    const { repository, consumerModel } = buildRepository();
    consumerModel.findUnique.mockResolvedValueOnce(null);

    await expect(
      repository.applyDecision({
        consumerId: `consumer-1`,
        adminId: `admin-1`,
        reason: null,
        expectedVersion: 123,
        notificationType: `email`,
        actionName: `verification_approve`,
        nextState: {
          verificationStatus: `APPROVED`,
          verified: true,
          legalVerified: true,
        },
        meta: {},
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it(`throws the canonical stale-version conflict before entering the transaction`, async () => {
    const { repository, consumerModel } = buildRepository();
    const currentUpdatedAt = new Date(`2026-04-15T10:05:00.000Z`);
    consumerModel.findUnique.mockResolvedValueOnce({
      id: `consumer-1`,
      verificationStatus: `PENDING`,
      updatedAt: currentUpdatedAt,
      email: `user@example.com`,
    });

    await expect(
      repository.applyDecision({
        consumerId: `consumer-1`,
        adminId: `admin-1`,
        reason: null,
        expectedVersion: new Date(`2026-04-15T10:00:00.000Z`).getTime(),
        notificationType: `email`,
        actionName: `verification_approve`,
        nextState: {
          verificationStatus: `APPROVED`,
          verified: true,
          legalVerified: true,
        },
        meta: {},
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it(`persists the decision transaction and returns audit metadata for later notification updates`, async () => {
    const { repository, consumerModel, tx } = buildRepository();
    consumerModel.findUnique.mockResolvedValueOnce({
      id: `consumer-1`,
      verificationStatus: `PENDING`,
      updatedAt: new Date(`2026-04-15T10:00:00.000Z`),
      email: `user@example.com`,
    });
    tx.consumerModel.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.adminActionAuditLogModel.create.mockResolvedValueOnce({ id: `audit-1` });
    tx.consumerModel.findUniqueOrThrow.mockResolvedValueOnce({
      id: `consumer-1`,
      verificationStatus: `APPROVED`,
      verificationReason: null,
      verificationUpdatedAt: new Date(`2026-04-15T10:05:00.000Z`),
      updatedAt: new Date(`2026-04-15T10:05:00.000Z`),
    });

    const result = await repository.applyDecision({
      consumerId: `consumer-1`,
      adminId: `admin-1`,
      reason: null,
      expectedVersion: new Date(`2026-04-15T10:00:00.000Z`).getTime(),
      notificationType: `email`,
      actionName: `verification_approve`,
      nextState: {
        verificationStatus: `APPROVED`,
        verified: true,
        legalVerified: true,
      },
      meta: {
        ipAddress: `127.0.0.1`,
        userAgent: `jest`,
      },
    });

    expect(tx.consumerModel.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: `consumer-1`,
        }),
        data: expect.objectContaining({
          verificationStatus: `APPROVED`,
          verified: true,
          legalVerified: true,
        }),
      }),
    );
    expect(tx.adminActionAuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: `verification_approve`,
          resource: `consumer`,
          resourceId: `consumer-1`,
          metadata: expect.objectContaining({
            fromStatus: `PENDING`,
            toStatus: `APPROVED`,
            notificationType: `email`,
            notificationSent: false,
          }),
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        consumerEmail: `user@example.com`,
        auditEntryId: `audit-1`,
        auditMetadata: expect.objectContaining({
          notificationType: `email`,
          notificationSent: false,
        }),
      }),
    );
  });

  it(`updates audit notification status through the persistence collaborator`, async () => {
    const { repository, adminActionAuditLogModel } = buildRepository();
    adminActionAuditLogModel.update.mockResolvedValueOnce(undefined);

    await repository.updateAuditNotificationStatus(`audit-1`, {
      notificationType: `email`,
      notificationSent: true,
    });

    expect(adminActionAuditLogModel.update).toHaveBeenCalledWith({
      where: { id: `audit-1` },
      data: {
        metadata: {
          notificationType: `email`,
          notificationSent: true,
        },
      },
    });
  });
});
