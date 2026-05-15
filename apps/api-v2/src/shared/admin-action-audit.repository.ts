import { Injectable } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { PrismaService } from './prisma.service';

export type AdminActionAuditWriteParams = {
  adminId: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type AdminActionAuditWriteClient = {
  adminActionAuditLogModel: Pick<Prisma.TransactionClient[`adminActionAuditLogModel`], `create`>;
};

@Injectable()
export class AdminActionAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createAuditEntry(params: AdminActionAuditWriteParams, client?: AdminActionAuditWriteClient): Promise<void> {
    const db = client ?? this.prisma;
    const { adminId, action, resource, resourceId, metadata, ipAddress, userAgent } = params;

    await db.adminActionAuditLogModel.create({
      data: {
        adminId,
        action,
        resource,
        resourceId: resourceId ?? null,
        metadata: metadata ?? Prisma.JsonNull,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });
  }
}
