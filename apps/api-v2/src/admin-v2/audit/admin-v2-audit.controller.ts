import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2AuditService } from './admin-v2-audit.service';

function one(value: string | string[] | undefined): string | undefined {
  return (typeof value === `string` ? value : value?.[0])?.trim() || undefined;
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseNumber(value: string | undefined, fallback: number): number {
  return value != null && Number.isFinite(Number(value)) ? Number(value) : fallback;
}

@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
@ApiTags(`Admin v2: Audit`)
@Controller(`admin-v2/audit`)
export class AdminV2AuditController {
  constructor(
    private readonly service: AdminV2AuditService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  @Get(`auth`)
  async getAuthAudit(
    @Identity() admin: IIdentityContext,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    await this.accessService.assertCapability(admin, `audit.read`);
    return this.service.getAuthAudit({
      email: one(query.email),
      event: one(query.event),
      ipAddress: one(query.ipAddress),
      dateFrom: parseDate(one(query.dateFrom)),
      dateTo: parseDate(one(query.dateTo)),
      page: parseNumber(one(query.page), 1),
      pageSize: parseNumber(one(query.pageSize), 20),
    });
  }

  @Get(`admin-actions`)
  async getAdminActionAudit(
    @Identity() admin: IIdentityContext,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    await this.accessService.assertCapability(admin, `audit.read`);
    return this.service.getAdminActionAudit({
      action: one(query.action),
      adminId: one(query.adminId),
      email: one(query.email),
      resourceId: one(query.resourceId),
      dateFrom: parseDate(one(query.dateFrom)),
      dateTo: parseDate(one(query.dateTo)),
      page: parseNumber(one(query.page), 1),
      pageSize: parseNumber(one(query.pageSize), 20),
    });
  }

  @Get(`consumer-actions`)
  async getConsumerActionAudit(
    @Identity() admin: IIdentityContext,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    await this.accessService.assertCapability(admin, `audit.read`);
    return this.service.getConsumerActionAudit({
      consumerId: one(query.consumerId),
      action: one(query.action),
      dateFrom: parseDate(one(query.dateFrom)),
      dateTo: parseDate(one(query.dateTo)),
      page: parseNumber(one(query.page), 1),
      pageSize: parseNumber(one(query.pageSize), 20),
    });
  }
}
