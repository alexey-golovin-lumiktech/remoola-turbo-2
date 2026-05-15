import { Injectable } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class AdminV2AdminAuditTrailRepository {
  constructor(private readonly prisma: PrismaService) {}

  updateNotificationStatus(params: { auditId: string; metadata: Prisma.InputJsonValue }) {
    return this.prisma.adminActionAuditLogModel.update({
      where: { id: params.auditId },
      data: {
        metadata: params.metadata,
      },
    });
  }

  createAdminAuditEntry(params: {
    adminId: string;
    action: string;
    resourceId: string;
    metadata?: Prisma.InputJsonValue;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    return this.prisma.adminActionAuditLogModel.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        resource: `admin`,
        resourceId: params.resourceId,
        metadata: params.metadata ?? Prisma.JsonNull,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  }
}
