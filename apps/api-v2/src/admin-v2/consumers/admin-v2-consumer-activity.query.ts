import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class AdminV2ConsumerActivityQuery {
  constructor(private readonly prisma: PrismaService) {}

  findAuthHistory(where: Record<string, unknown>, skip: number, take: number) {
    return this.prisma.authAuditLogModel.findMany({
      where,
      orderBy: { createdAt: `desc` },
      skip,
      take,
    });
  }

  countAuthHistory(where: Record<string, unknown>) {
    return this.prisma.authAuditLogModel.count({ where });
  }

  findActionLog(where: Record<string, unknown>, skip: number, take: number) {
    return this.prisma.consumerActionLogModel.findMany({
      where,
      orderBy: { createdAt: `desc` },
      skip,
      take,
    });
  }

  countActionLog(where: Record<string, unknown>) {
    return this.prisma.consumerActionLogModel.count({ where });
  }
}
