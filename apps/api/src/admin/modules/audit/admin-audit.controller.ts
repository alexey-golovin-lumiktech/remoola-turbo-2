import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { type AdminModel } from '@remoola/database-2';
import { adminErrorCodes } from '@remoola/shared-constants';

import { AdminAuditService } from './admin-audit.service';
import { AdminAuditAuthQueryDto, AdminAuditActionsQueryDto } from './dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common';

function one(v: string | string[] | number | undefined): string | undefined {
  if (typeof v === `number`) return String(v);
  return (typeof v === `string` ? v : v?.[0])?.trim() || undefined;
}

function parseAuthQuery(q: AdminAuditAuthQueryDto) {
  const pageRaw = one(q.page as unknown as string | string[] | undefined);
  const pageSizeRaw = one(q.pageSize as unknown as string | string[] | undefined);
  const page = pageRaw != null && Number.isFinite(Number(pageRaw)) ? Number(pageRaw) : 1;
  const pageSize =
    pageSizeRaw != null && Number.isFinite(Number(pageSizeRaw)) ? Math.min(500, Math.max(1, Number(pageSizeRaw))) : 20;
  const dateFrom = one(q.dateFrom as string | string[] | undefined);
  const dateTo = one(q.dateTo as string | string[] | undefined);
  return {
    email: one(q.email as string | string[] | undefined),
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
    page,
    pageSize,
  };
}

function parseActionsQuery(q: AdminAuditActionsQueryDto) {
  const pageRaw = one(q.page as unknown as string | string[] | undefined);
  const pageSizeRaw = one(q.pageSize as unknown as string | string[] | undefined);
  const page = pageRaw != null && Number.isFinite(Number(pageRaw)) ? Number(pageRaw) : 1;
  const pageSize =
    pageSizeRaw != null && Number.isFinite(Number(pageSizeRaw)) ? Math.min(500, Math.max(1, Number(pageSizeRaw))) : 20;
  const dateFrom = one(q.dateFrom as string | string[] | undefined);
  const dateTo = one(q.dateTo as string | string[] | undefined);
  return {
    action: one(q.action as string | string[] | undefined),
    adminId: one(q.adminId as string | string[] | undefined),
    email: one(q.email as string | string[] | undefined),
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
    page,
    pageSize,
  };
}

@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
@ApiTags(`Admin: Audit`)
@Controller(`admin/audit`)
export class AdminAuditController {
  constructor(private readonly service: AdminAuditService) {}

  @Get(`auth`)
  getAuthLog(@Identity() admin: AdminModel, @Query() query: AdminAuditAuthQueryDto) {
    if (admin.type !== `SUPER`) {
      throw new BadRequestException(adminErrorCodes.ADMIN_ONLY_SUPER_CAN_VIEW_AUDIT);
    }
    return this.service.getAuthLog(parseAuthQuery(query));
  }

  @Get(`actions`)
  getActionLog(@Identity() admin: AdminModel, @Query() query: AdminAuditActionsQueryDto) {
    if (admin.type !== `SUPER`) {
      throw new BadRequestException(adminErrorCodes.ADMIN_ONLY_SUPER_CAN_VIEW_AUDIT);
    }
    return this.service.getActionLog(parseActionsQuery(query));
  }
}
