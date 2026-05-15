import { Injectable } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { ADMIN_AUTH_SESSION_REVOKE_REASONS } from '../../admin-auth/admin-auth-session-reasons';
import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { PrismaService } from '../../shared/prisma.service';

const activeAdminByEmailSelect = Prisma.validator<Prisma.AdminModelSelect>()({
  id: true,
  email: true,
});

const resetTargetSelect = Prisma.validator<Prisma.AdminModelSelect>()({
  id: true,
  email: true,
  updatedAt: true,
  deletedAt: true,
});

const resetTokenSelect = Prisma.validator<Prisma.ResetPasswordModelSelect>()({
  id: true,
  adminId: true,
});

@Injectable()
export class AdminV2AdminPasswordFlowsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: PrismaTransactionRunner,
  ) {}

  getActiveAdminByEmail(email: string) {
    return this.prisma.adminModel.findFirst({
      where: { email, deletedAt: null },
      select: activeAdminByEmailSelect,
    });
  }

  getResetTarget(targetAdminId: string) {
    return this.prisma.adminModel.findUnique({
      where: { id: targetAdminId },
      select: resetTargetSelect,
    });
  }

  createPasswordResetArtifact(params: {
    adminId: string;
    auditAdminId: string;
    email: string;
    tokenHash: string;
    expiresAt: Date;
    metadata: Prisma.InputJsonValue;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    const { adminId, auditAdminId, email, tokenHash, expiresAt, metadata, ipAddress, userAgent } = params;

    return this.transactions.run(async (tx) => {
      await tx.resetPasswordModel.updateMany({
        where: {
          adminId,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });
      await tx.resetPasswordModel.create({
        data: {
          adminId,
          tokenHash,
          expiredAt: expiresAt,
          appScope: `admin-v2`,
        },
      });
      const audit = await tx.adminActionAuditLogModel.create({
        data: {
          adminId: auditAdminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.admin_password_reset,
          resource: `admin`,
          resourceId: adminId,
          metadata: {
            targetEmail: email,
            notificationSent: false,
            notificationType: `email`,
            deliveryStatus: `pending`,
            ...(metadata as Record<string, unknown>),
          } as Prisma.InputJsonValue,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
        select: {
          id: true,
        },
      });
      return {
        auditId: audit.id,
      };
    });
  }

  updateAuditNotificationStatus(params: {
    auditId: string;
    metadata: Prisma.InputJsonValue;
    notificationSent: boolean;
  }) {
    const { auditId, metadata, notificationSent } = params;

    return this.prisma.adminActionAuditLogModel.update({
      where: { id: auditId },
      data: {
        metadata: {
          ...(metadata as Record<string, unknown>),
          notificationSent,
          notificationType: `email`,
          deliveryStatus: notificationSent ? `sent` : `failed`,
        } as Prisma.InputJsonValue,
      },
    });
  }

  getResetToken(tokenHash: string) {
    return this.prisma.resetPasswordModel.findFirst({
      where: {
        tokenHash,
        adminId: { not: null },
        deletedAt: null,
        expiredAt: { gt: new Date() },
        appScope: `admin-v2`,
      },
      select: resetTokenSelect,
    });
  }

  getActiveAdminById(adminId: string) {
    return this.prisma.adminModel.findFirst({
      where: { id: adminId, deletedAt: null },
      select: activeAdminByEmailSelect,
    });
  }

  consumeResetTokenAndUpdatePassword(params: { resetTokenId: string; adminId: string; hash: string; salt: string }) {
    const { resetTokenId, adminId, hash, salt } = params;

    return this.transactions.run(async (tx) => {
      const updateResult = await tx.resetPasswordModel.updateMany({
        where: { id: resetTokenId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (updateResult.count !== 1) {
        return false;
      }
      await tx.adminModel.update({
        where: { id: adminId },
        data: {
          password: hash,
          salt,
        },
      });
      await tx.adminAuthSessionModel.updateMany({
        where: {
          adminId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          invalidatedReason: ADMIN_AUTH_SESSION_REVOKE_REASONS.password_reset,
          lastUsedAt: new Date(),
        },
      });
      await tx.accessRefreshTokenModel.deleteMany({
        where: {
          identityId: adminId,
        },
      });
      return true;
    });
  }
}
