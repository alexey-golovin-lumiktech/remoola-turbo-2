import { Injectable } from '@nestjs/common';

import { AUTH_IDENTITY_TYPES } from '../../../shared/auth-audit.service';
import { PrismaService } from '../../../shared/prisma.service';

const MAX_PAGE_SIZE = 500;

export type AuthAuditListParams = {
  email?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  pageSize: number;
};

export type ActionAuditListParams = {
  action?: string;
  adminId?: string;
  email?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  pageSize: number;
};

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getAuthLog(params: AuthAuditListParams) {
    const page = Math.max(1, params.page);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize));
    const skip = (page - 1) * pageSize;

    const where = {
      identityType: AUTH_IDENTITY_TYPES.admin,
      ...(params.email?.trim() && {
        email: { equals: params.email.trim().toLowerCase(), mode: `insensitive` as const },
      }),
      ...(params.dateFrom && { createdAt: { gte: params.dateFrom } }),
      ...(params.dateTo && { createdAt: { lte: params.dateTo } }),
    };

    const [total, items] = await Promise.all([
      this.prisma.authAuditLogModel.count({ where }),
      this.prisma.authAuditLogModel.findMany({
        where,
        orderBy: { createdAt: `desc` },
        skip,
        take: pageSize,
      }),
    ]);

    return { items, total, page, pageSize };
  }

  async getActionLog(params: ActionAuditListParams) {
    const page = Math.max(1, params.page);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize));
    const skip = (page - 1) * pageSize;

    const createdAtFilter =
      params.dateFrom && params.dateTo
        ? { gte: params.dateFrom, lte: params.dateTo }
        : params.dateFrom
          ? { gte: params.dateFrom }
          : params.dateTo
            ? { lte: params.dateTo }
            : undefined;

    const where = {
      ...(params.action?.trim() && { action: params.action.trim() }),
      ...(params.adminId?.trim() && { adminId: params.adminId.trim() }),
      ...(params.email?.trim() && {
        admin: { email: { equals: params.email.trim().toLowerCase() } },
      }),
      ...(createdAtFilter && { createdAt: createdAtFilter }),
    };

    const [total, rows] = await Promise.all([
      this.prisma.adminActionAuditLogModel.count({ where }),
      this.prisma.adminActionAuditLogModel.findMany({
        where,
        orderBy: { createdAt: `desc` },
        skip,
        take: pageSize,
        include: { admin: { select: { email: true } } },
      }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      adminId: r.adminId,
      adminEmail: r.admin?.email ?? null,
      action: r.action,
      resource: r.resource,
      resourceId: r.resourceId,
      metadata: r.metadata,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      createdAt: r.createdAt,
    }));

    return { items, total, page, pageSize };
  }
}
