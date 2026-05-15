import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { PrismaService } from '../../shared/prisma.service';

type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AdminV2ConsumerFlagsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: PrismaTransactionRunner,
  ) {}

  findActiveByConsumerAndFlag(consumerId: string, flag: string) {
    return this.prisma.consumerFlagModel.findFirst({
      where: {
        consumerId,
        flag,
        removedAt: null,
      },
      select: {
        id: true,
        flag: true,
        reason: true,
        version: true,
        createdAt: true,
      },
    });
  }

  createWithAudit(consumerId: string, adminId: string, flag: string, reason: string | null, meta?: RequestMeta) {
    return this.transactions.run(async (tx) => {
      const created = await tx.consumerFlagModel.create({
        data: {
          consumerId,
          adminId,
          flag,
          reason,
        },
        select: {
          id: true,
          flag: true,
          reason: true,
          version: true,
          createdAt: true,
        },
      });

      await tx.adminActionAuditLogModel.create({
        data: {
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.consumer_flag_add,
          resource: `consumer`,
          resourceId: consumerId,
          metadata: { flagId: created.id, flag, reason },
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
        },
      });

      return created;
    });
  }

  removeWithAudit(consumerId: string, flagId: string, adminId: string, version: number, meta?: RequestMeta) {
    return this.transactions.run(async (tx) => {
      const flag = await tx.consumerFlagModel.findFirst({
        where: {
          id: flagId,
          consumerId,
        },
        select: {
          id: true,
          flag: true,
          version: true,
          removedAt: true,
        },
      });

      if (!flag) {
        throw new NotFoundException(`Flag not found`);
      }
      if (flag.removedAt) {
        return { id: flag.id, alreadyRemoved: true };
      }
      if (flag.version !== version) {
        throw new ConflictException({
          error: `STALE_VERSION`,
          message: `Resource has been modified by another operator`,
          currentVersion: flag.version,
          recommendedAction: `reload`,
        });
      }

      const removedAt = new Date();
      const updated = await tx.consumerFlagModel.update({
        where: { id: flagId },
        data: {
          removedAt,
          removedBy: adminId,
          version: { increment: 1 },
        },
        select: {
          id: true,
          flag: true,
          version: true,
          removedAt: true,
        },
      });

      await tx.adminActionAuditLogModel.create({
        data: {
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.consumer_flag_remove,
          resource: `consumer`,
          resourceId: consumerId,
          metadata: { flagId, flag: flag.flag, removedAt },
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
        },
      });

      return updated;
    });
  }
}
