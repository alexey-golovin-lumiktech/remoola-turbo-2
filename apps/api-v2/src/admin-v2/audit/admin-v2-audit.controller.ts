import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { adminV2AuditListResponseSchema, type AdminV2AuditListResponse } from '@remoola/api-types';

import { Identity, type IIdentityContext } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { toAdminV2WireContract } from '../admin-v2-wire-contract';
import {
  AdminActionAuditWithPagingQuery,
  AuthAuditWithPagingQuery,
  ConsumerActionAuditWithPagingQuery,
} from './admin-v2-audit.dto';
import { AdminV2AuditService } from './admin-v2-audit.service';

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
  async getAuthAudit(
    @Identity() admin: IIdentityContext,
    @Query() query: AuthAuditWithPagingQuery,
  ): Promise<AdminV2AuditListResponse> {
    await this.accessService.assertCapability(admin, `audit.read`);
    return toAdminV2WireContract(
      adminV2AuditListResponseSchema,
      await this.service.getAuthAudit({
        ...query,
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
      }),
    );
  }

  @Get(`admin-actions`)
  async getAdminActionAudit(
    @Identity() admin: IIdentityContext,
    @Query() query: AdminActionAuditWithPagingQuery,
  ): Promise<AdminV2AuditListResponse> {
    await this.accessService.assertCapability(admin, `audit.read`);
    return toAdminV2WireContract(
      adminV2AuditListResponseSchema,
      await this.service.getAdminActionAudit({
        ...query,
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
      }),
    );
  }

  @Get(`consumer-actions`)
  async getConsumerActionAudit(
    @Identity() admin: IIdentityContext,
    @Query() query: ConsumerActionAuditWithPagingQuery,
  ): Promise<AdminV2AuditListResponse> {
    await this.accessService.assertCapability(admin, `audit.read`);
    return toAdminV2WireContract(
      adminV2AuditListResponseSchema,
      await this.service.getConsumerActionAudit({
        ...query,
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
      }),
    );
  }
}
