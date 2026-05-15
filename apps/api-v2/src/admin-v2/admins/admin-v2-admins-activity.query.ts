import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class AdminV2AdminsActivityQuery {
  constructor(private readonly prisma: PrismaService) {}

  listLastActivitySources(adminIds: string[]) {
    return Promise.all([
      this.prisma.authAuditLogModel.findMany({
        where: {
          identityType: `admin`,
          identityId: { in: adminIds },
        },
        orderBy: [{ createdAt: `desc` }, { id: `desc` }],
        take: adminIds.length * 5,
        select: {
          identityId: true,
          createdAt: true,
        },
      }),
      this.prisma.adminActionAuditLogModel.findMany({
        where: {
          adminId: { in: adminIds },
        },
        orderBy: [{ createdAt: `desc` }, { id: `desc` }],
        take: adminIds.length * 5,
        select: {
          adminId: true,
          createdAt: true,
        },
      }),
    ]);
  }

  listRecentAuditActions(adminId: string, take: number) {
    return this.prisma.adminActionAuditLogModel.findMany({
      where: { adminId },
      include: {
        admin: {
          select: {
            email: true,
          },
        },
      },
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      take,
    });
  }

  listRecentAuthEvents(adminId: string, take: number) {
    return this.prisma.authAuditLogModel.findMany({
      where: {
        identityType: `admin`,
        identityId: adminId,
      },
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      take,
      select: {
        id: true,
        event: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
    });
  }
}
