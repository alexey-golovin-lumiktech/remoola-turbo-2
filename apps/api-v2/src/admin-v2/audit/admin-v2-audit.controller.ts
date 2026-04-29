import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Expose, Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2AuditService } from './admin-v2-audit.service';

function transformDate(value: unknown): Date | undefined {
  if (typeof value !== `string` || value.trim().length === 0) {
    return undefined;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

class AdminAuditBaseQuery {
  @Expose()
  @Transform(({ value }) => transformDate(value))
  @IsOptional()
  dateFrom?: Date;

  @Expose()
  @Transform(({ value }) => transformDate(value))
  @IsOptional()
  dateTo?: Date;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  pageSize?: number;
}

class AuthAuditQuery extends AdminAuditBaseQuery {
  @Expose()
  @IsString()
  @IsOptional()
  email?: string;

  @Expose()
  @IsString()
  @IsOptional()
  event?: string;

  @Expose()
  @IsString()
  @IsOptional()
  ipAddress?: string;
}

class AdminActionAuditQuery extends AdminAuditBaseQuery {
  @Expose()
  @IsString()
  @IsOptional()
  action?: string;

  @Expose()
  @IsString()
  @IsOptional()
  adminId?: string;

  @Expose()
  @IsString()
  @IsOptional()
  email?: string;

  @Expose()
  @IsString()
  @IsOptional()
  resourceId?: string;
}

class ConsumerActionAuditQuery extends AdminAuditBaseQuery {
  @Expose()
  @IsString()
  @IsOptional()
  consumerId?: string;

  @Expose()
  @IsString()
  @IsOptional()
  action?: string;
}

@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
@ApiTags(`Admin v2: Audit`)
@Throttle({ default: { limit: 500, ttl: 60000 } })
@Controller(`admin-v2/audit`)
export class AdminV2AuditController {
  constructor(
    private readonly service: AdminV2AuditService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  @Get(`auth`)
  async getAuthAudit(@Identity() admin: IIdentityContext, @Query() query: AuthAuditQuery) {
    await this.accessService.assertCapability(admin, `audit.read`);
    return this.service.getAuthAudit({
      ...query,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }

  @Get(`admin-actions`)
  async getAdminActionAudit(@Identity() admin: IIdentityContext, @Query() query: AdminActionAuditQuery) {
    await this.accessService.assertCapability(admin, `audit.read`);
    return this.service.getAdminActionAudit({
      ...query,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }

  @Get(`consumer-actions`)
  async getConsumerActionAudit(@Identity() admin: IIdentityContext, @Query() query: ConsumerActionAuditQuery) {
    await this.accessService.assertCapability(admin, `audit.read`);
    return this.service.getConsumerActionAudit({
      ...query,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }
}
