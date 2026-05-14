import { Injectable } from '@nestjs/common';

import { type Prisma } from '@remoola/database-2';

import { buildCreatedAtFilter, normalizePagination } from './admin-v2-consumer-query-helpers';
import { AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';
import { PrismaService } from '../../shared/prisma.service';

const DEFAULT_CONSUMER_ACTION_RANGE_DAYS = 7;

@Injectable()
export class AdminV2ConsumerActivityQuery {
  constructor(private readonly prisma: PrismaService) {}

  async getConsumerAuthHistory(params: {
    consumerId: string;
    consumerEmail: string;
    page?: number;
    pageSize?: number;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const pagination = normalizePagination(params.page, params.pageSize);
    const where = this.buildAuthHistoryWhere(params);
    const [items, total] = await Promise.all([
      this.findAuthHistory(where, pagination.skip, pagination.pageSize),
      this.countAuthHistory(where),
    ]);

    return {
      items,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async getConsumerActionLog(params: {
    consumerId: string;
    page?: number;
    pageSize?: number;
    dateFrom?: Date;
    dateTo?: Date;
    action?: string;
  }) {
    const pagination = normalizePagination(params.page, params.pageSize);
    const dateTo = params.dateTo ?? new Date();
    const dateFrom = params.dateFrom ?? new Date(Date.now() - DEFAULT_CONSUMER_ACTION_RANGE_DAYS * 24 * 60 * 60 * 1000);
    const where = this.buildActionLogWhere({
      consumerId: params.consumerId,
      action: params.action,
      dateFrom,
      dateTo,
    });
    const [items, total] = await Promise.all([
      this.findActionLog(where, pagination.skip, pagination.pageSize),
      this.countActionLog(where),
    ]);

    return {
      items,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      dateFrom,
      dateTo,
    };
  }

  private buildAuthHistoryWhere(params: {
    consumerId: string;
    consumerEmail: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Prisma.AuthAuditLogModelWhereInput {
    const createdAt = buildCreatedAtFilter(params.dateFrom, params.dateTo);

    return {
      identityType: AUTH_IDENTITY_TYPES.consumer,
      OR: [{ identityId: params.consumerId }, { email: params.consumerEmail.toLowerCase() }],
      ...(createdAt ? { createdAt } : {}),
    };
  }

  private buildActionLogWhere(params: {
    consumerId: string;
    action?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Prisma.ConsumerActionLogModelWhereInput {
    const createdAt = buildCreatedAtFilter(params.dateFrom, params.dateTo);

    return {
      consumerId: params.consumerId,
      ...(params.action?.trim() ? { action: params.action.trim() } : {}),
      ...(createdAt ? { createdAt } : {}),
    };
  }

  private findAuthHistory(where: Prisma.AuthAuditLogModelWhereInput, skip: number, take: number) {
    return this.prisma.authAuditLogModel.findMany({
      where,
      orderBy: { createdAt: `desc` },
      skip,
      take,
    });
  }

  private countAuthHistory(where: Prisma.AuthAuditLogModelWhereInput) {
    return this.prisma.authAuditLogModel.count({ where });
  }

  private findActionLog(where: Prisma.ConsumerActionLogModelWhereInput, skip: number, take: number) {
    return this.prisma.consumerActionLogModel.findMany({
      where,
      orderBy: { createdAt: `desc` },
      skip,
      take,
    });
  }

  private countActionLog(where: Prisma.ConsumerActionLogModelWhereInput) {
    return this.prisma.consumerActionLogModel.count({ where });
  }
}
