import { Injectable } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class AdminV2AuditQuery {
  constructor(private readonly prisma: PrismaService) {}

  listAuthAudit(params: { where: Prisma.AuthAuditLogModelWhereInput; skip: number; take: number }) {
    return Promise.all([
      this.prisma.authAuditLogModel.findMany({
        where: params.where,
        orderBy: { createdAt: `desc` },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.authAuditLogModel.count({ where: params.where }),
    ]);
  }

  listAdminActionAudit(params: { where: Prisma.AdminActionAuditLogModelWhereInput; skip: number; take: number }) {
    return Promise.all([
      this.prisma.adminActionAuditLogModel.findMany({
        where: params.where,
        include: {
          admin: {
            select: {
              email: true,
            },
          },
        },
        orderBy: { createdAt: `desc` },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.adminActionAuditLogModel.count({ where: params.where }),
    ]);
  }

  listConsumerActionAudit(params: { where: Prisma.ConsumerActionLogModelWhereInput; skip: number; take: number }) {
    return Promise.all([
      this.prisma.consumerActionLogModel.findMany({
        where: params.where,
        orderBy: { createdAt: `desc` },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.consumerActionLogModel.count({ where: params.where }),
    ]);
  }
}
