import { Injectable } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class AdminV2ExchangeRateQuery {
  constructor(private readonly prisma: PrismaService) {}

  listRates(params: { where: Prisma.ExchangeRateModelWhereInput; skip: number; take: number }) {
    return Promise.all([
      this.prisma.exchangeRateModel.count({ where: params.where }),
      this.prisma.exchangeRateModel.findMany({
        where: params.where,
        orderBy: [{ effectiveAt: `desc` }, { createdAt: `desc` }, { id: `desc` }],
        skip: params.skip,
        take: params.take,
      }),
    ]);
  }

  findRateById(rateId: string) {
    return this.prisma.exchangeRateModel.findFirst({
      where: { id: rateId, deletedAt: null },
    });
  }

  listApprovalHistory(rateId: string) {
    return this.prisma.adminActionAuditLogModel.findMany({
      where: {
        resource: `exchange_rate`,
        resourceId: rateId,
        action: ADMIN_ACTION_AUDIT_ACTIONS.exchange_rate_approve,
      },
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      select: {
        id: true,
        action: true,
        createdAt: true,
        metadata: true,
        admin: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }
}
