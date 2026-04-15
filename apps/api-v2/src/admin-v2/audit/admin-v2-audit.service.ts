import { BadRequestException, Injectable } from '@nestjs/common';

import { AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';
import { PrismaService } from '../../shared/prisma.service';

const MAX_PAGE_SIZE = 200;
const MAX_CONSUMER_ACTION_RANGE_DAYS = 31;

type BaseListParams = {
  page: number;
  pageSize: number;
  dateFrom?: Date;
  dateTo?: Date;
};

type AuthAuditParams = BaseListParams & {
  email?: string;
  event?: string;
  ipAddress?: string;
};

type AdminActionParams = BaseListParams & {
  action?: string;
  adminId?: string;
  email?: string;
  resourceId?: string;
};

type ConsumerActionParams = BaseListParams & {
  consumerId?: string;
  action?: string;
};

function normalizePagination(page?: number, pageSize?: number) {
  const safePage = Math.max(1, page ?? 1);
  const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize ?? 20));
  return {
    page: safePage,
    pageSize: safePageSize,
    skip: (safePage - 1) * safePageSize,
  };
}

function buildCreatedAtFilter(dateFrom?: Date, dateTo?: Date) {
  if (dateFrom && dateTo) {
    return { gte: dateFrom, lte: dateTo };
  }
  if (dateFrom) {
    return { gte: dateFrom };
  }
  if (dateTo) {
    return { lte: dateTo };
  }
  return undefined;
}

@Injectable()
export class AdminV2AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getAuthAudit(params: AuthAuditParams) {
    const pagination = normalizePagination(params.page, params.pageSize);
    const createdAt = buildCreatedAtFilter(params.dateFrom, params.dateTo);
    const where = {
      identityType: AUTH_IDENTITY_TYPES.admin,
      ...(params.email?.trim()
        ? {
            email: {
              equals: params.email.trim().toLowerCase(),
              mode: `insensitive` as const,
            },
          }
        : {}),
      ...(params.event?.trim()
        ? {
            event: {
              equals: params.event.trim(),
              mode: `insensitive` as const,
            },
          }
        : {}),
      ...(params.ipAddress?.trim()
        ? {
            ipAddress: {
              contains: params.ipAddress.trim(),
              mode: `insensitive` as const,
            },
          }
        : {}),
      ...(createdAt ? { createdAt } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.authAuditLogModel.findMany({
        where,
        orderBy: { createdAt: `desc` },
        skip: pagination.skip,
        take: pagination.pageSize,
      }),
      this.prisma.authAuditLogModel.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        identityType: item.identityType,
        identityId: item.identityId,
        event: item.event,
        email: item.email,
        ipAddress: item.ipAddress,
        userAgent: item.userAgent,
        createdAt: item.createdAt,
      })),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async getAdminActionAudit(params: AdminActionParams) {
    const pagination = normalizePagination(params.page, params.pageSize);
    const createdAt = buildCreatedAtFilter(params.dateFrom, params.dateTo);
    const where = {
      ...(params.action?.trim() ? { action: params.action.trim() } : {}),
      ...(params.adminId?.trim() ? { adminId: params.adminId.trim() } : {}),
      ...(params.resourceId?.trim() ? { resourceId: params.resourceId.trim() } : {}),
      ...(params.email?.trim()
        ? {
            admin: {
              email: {
                equals: params.email.trim().toLowerCase(),
                mode: `insensitive` as const,
              },
            },
          }
        : {}),
      ...(createdAt ? { createdAt } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.adminActionAuditLogModel.findMany({
        where,
        include: {
          admin: {
            select: {
              email: true,
            },
          },
        },
        orderBy: { createdAt: `desc` },
        skip: pagination.skip,
        take: pagination.pageSize,
      }),
      this.prisma.adminActionAuditLogModel.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        action: row.action,
        resource: row.resource,
        resourceId: row.resourceId,
        metadata: row.metadata,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: row.createdAt,
        adminId: row.adminId,
        adminEmail: row.admin?.email ?? null,
      })),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async getConsumerActionAudit(params: ConsumerActionParams) {
    if (!params.dateFrom) {
      throw new BadRequestException(`dateFrom is required for consumer action audit`);
    }
    const dateTo = params.dateTo ?? new Date();
    const rangeMs = dateTo.getTime() - params.dateFrom.getTime();
    if (Number.isNaN(rangeMs) || rangeMs < 0) {
      throw new BadRequestException(`Invalid consumer action audit range`);
    }
    if (rangeMs > MAX_CONSUMER_ACTION_RANGE_DAYS * 24 * 60 * 60 * 1000) {
      throw new BadRequestException(`Consumer action audit range is too large`);
    }

    const pagination = normalizePagination(params.page, params.pageSize);
    const where = {
      createdAt: {
        gte: params.dateFrom,
        lte: dateTo,
      },
      ...(params.consumerId?.trim() ? { consumerId: params.consumerId.trim() } : {}),
      ...(params.action?.trim() ? { action: params.action.trim() } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.consumerActionLogModel.findMany({
        where,
        orderBy: { createdAt: `desc` },
        skip: pagination.skip,
        take: pagination.pageSize,
      }),
      this.prisma.consumerActionLogModel.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        consumerId: item.consumerId,
        action: item.action,
        resource: item.resource,
        resourceId: item.resourceId,
        metadata: item.metadata,
        ipAddress: item.ipAddress,
        userAgent: item.userAgent,
        correlationId: item.correlationId,
        createdAt: item.createdAt,
      })),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      dateFrom: params.dateFrom,
      dateTo,
    };
  }
}
