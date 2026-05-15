import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { PrismaService } from '../../shared/prisma.service';

function deriveVersion(updatedAt: Date): number {
  return updatedAt.getTime();
}

function buildStaleVersionPayload(currentUpdatedAt: Date) {
  return {
    error: `STALE_VERSION`,
    message: `Resource has been modified by another operator`,
    currentVersion: deriveVersion(currentUpdatedAt),
    currentUpdatedAt: currentUpdatedAt.toISOString(),
    recommendedAction: `reload`,
  };
}

export type AdminV2VerificationDecisionState = {
  verificationStatus: $Enums.VerificationStatus;
  verified: boolean;
  legalVerified: boolean;
};

type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
};

@Injectable()
export class AdminV2VerificationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: PrismaTransactionRunner,
  ) {}

  async applyDecision(params: {
    consumerId: string;
    adminId: string;
    reason: string | null;
    expectedVersion: number;
    notificationType: `email` | null;
    actionName: string;
    nextState: AdminV2VerificationDecisionState;
    meta: RequestMeta;
  }) {
    const { consumerId, adminId, reason, expectedVersion, notificationType, actionName, nextState, meta } = params;
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: {
        id: true,
        verificationStatus: true,
        updatedAt: true,
        email: true,
      },
    });
    if (!consumer) {
      throw new NotFoundException(`Consumer not found`);
    }
    if (deriveVersion(consumer.updatedAt) !== expectedVersion) {
      throw new ConflictException(buildStaleVersionPayload(consumer.updatedAt));
    }

    const updatedAt = new Date();
    const auditMetadata = {
      fromStatus: consumer.verificationStatus,
      toStatus: nextState.verificationStatus,
      reason,
      expectedVersion,
      ...(notificationType ? { notificationType, notificationSent: false } : {}),
    } satisfies Prisma.InputJsonObject;

    const result = await this.transactions.run(async (tx) => {
      const updated = await tx.consumerModel.updateMany({
        where: {
          id: consumer.id,
          updatedAt: consumer.updatedAt,
        },
        data: {
          verificationStatus: nextState.verificationStatus,
          verified: nextState.verified,
          legalVerified: nextState.legalVerified,
          verificationReason: reason,
          verificationUpdatedAt: updatedAt,
          verificationUpdatedBy: adminId,
        },
      });
      if (updated.count === 0) {
        const current = await tx.consumerModel.findUnique({
          where: { id: consumer.id },
          select: { updatedAt: true },
        });
        throw new ConflictException(current ? buildStaleVersionPayload(current.updatedAt) : `Consumer has changed`);
      }

      const auditEntry = await tx.adminActionAuditLogModel.create({
        data: {
          adminId,
          action: actionName,
          resource: `consumer`,
          resourceId: consumer.id,
          metadata: auditMetadata,
          ipAddress: meta.ipAddress ?? null,
          userAgent: meta.userAgent ?? null,
        },
        select: {
          id: true,
        },
      });
      const updatedConsumer = await tx.consumerModel.findUniqueOrThrow({
        where: { id: consumer.id },
        select: {
          id: true,
          verificationStatus: true,
          verificationReason: true,
          verificationUpdatedAt: true,
          updatedAt: true,
        },
      });

      return { updatedConsumer, auditEntryId: auditEntry.id };
    });

    return {
      consumerEmail: consumer.email,
      auditEntryId: result.auditEntryId,
      auditMetadata,
      updatedConsumer: result.updatedConsumer,
    };
  }

  updateAuditNotificationStatus(auditEntryId: string, metadata: Prisma.InputJsonObject) {
    return this.prisma.adminActionAuditLogModel.update({
      where: { id: auditEntryId },
      data: {
        metadata,
      },
    });
  }
}
