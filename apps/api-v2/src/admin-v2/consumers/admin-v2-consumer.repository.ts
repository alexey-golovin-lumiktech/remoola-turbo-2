import { Injectable } from '@nestjs/common';

import { type Prisma } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class AdminV2ConsumerRepository {
  constructor(private readonly prisma: PrismaService) {}

  findSummaryById(consumerId: string) {
    return this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: {
        id: true,
        email: true,
        suspendedAt: true,
        suspendedBy: true,
        suspensionReason: true,
      },
    });
  }

  findMany(where: Prisma.ConsumerModelWhereInput, skip: number, take: number) {
    return this.prisma.consumerModel.findMany({
      where,
      orderBy: { createdAt: `desc` },
      skip,
      take,
      select: {
        id: true,
        email: true,
        accountType: true,
        contractorKind: true,
        verificationStatus: true,
        stripeIdentityStatus: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        personalDetails: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        organizationDetails: {
          select: {
            name: true,
          },
        },
        adminFlags: {
          where: { removedAt: null },
          orderBy: { createdAt: `desc` },
          take: 3,
          select: {
            id: true,
            flag: true,
          },
        },
        _count: {
          select: {
            adminNotes: true,
            adminFlags: {
              where: { removedAt: null },
            },
          },
        },
      },
    });
  }

  count(where: Prisma.ConsumerModelWhereInput) {
    return this.prisma.consumerModel.count({ where });
  }

  countActiveSessions(consumerId: string) {
    return this.prisma.authSessionModel.count({
      where: { consumerId, revokedAt: null },
    });
  }

  suspendIfActive(consumerId: string, adminId: string, reason: string, suspendedAt: Date) {
    return this.prisma.consumerModel.updateMany({
      where: {
        id: consumerId,
        suspendedAt: null,
      },
      data: {
        suspendedAt,
        suspendedBy: adminId,
        suspensionReason: reason,
      },
    });
  }
}
