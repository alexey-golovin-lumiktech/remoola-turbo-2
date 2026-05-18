import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Expose, Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { CONSUMER_APP_SCOPES } from '@remoola/api-types';

import { Identity, type IIdentityContext, RequestMeta, type RequestMeta as RequestMetaPayload } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2ConsumersService } from './admin-v2-consumers.service';

class ForceLogoutBody {
  @Expose()
  @IsBoolean()
  confirmed!: boolean;
}

class SuspendConsumerBody {
  @Expose()
  @IsBoolean()
  confirmed!: boolean;

  @Expose()
  @IsString()
  reason!: string;
}

class EmailResendBody {
  @Expose()
  @IsIn([`signup_verification`, `password_recovery`])
  emailKind!: `signup_verification` | `password_recovery`;

  @Expose()
  @IsIn(CONSUMER_APP_SCOPES)
  appScope!: (typeof CONSUMER_APP_SCOPES)[number];
}

function transformDate(value: unknown): Date | undefined {
  if (typeof value !== `string` || value.trim().length === 0) {
    return undefined;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

class AdminConsumersListQuery {
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

  @Expose()
  @IsString()
  @IsOptional()
  q?: string;

  @Expose()
  @IsString()
  @IsOptional()
  accountType?: string;

  @Expose()
  @IsString()
  @IsOptional()
  contractorKind?: string;

  @Expose()
  @IsString()
  @IsOptional()
  verificationStatus?: string;

  @Expose()
  @Transform(({ value }) => value === true || value === `true`)
  @IsBoolean()
  @IsOptional()
  includeDeleted?: boolean;
}

class AdminConsumerPaginationQuery {
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

  @Expose()
  @IsString()
  @IsOptional()
  q?: string;
}

class AdminConsumerDateRangeQuery {
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

  @Expose()
  @Transform(({ value }) => transformDate(value))
  @IsOptional()
  dateFrom?: Date;

  @Expose()
  @Transform(({ value }) => transformDate(value))
  @IsOptional()
  dateTo?: Date;
}

class AdminConsumerActionLogQuery extends AdminConsumerDateRangeQuery {
  @Expose()
  @IsString()
  @IsOptional()
  action?: string;
}

class ConsumerNoteBody {
  @Expose()
  @IsString()
  content!: string;
}

class ConsumerFlagBody {
  @Expose()
  @IsString()
  flag!: string;

  @Expose()
  @IsString()
  @IsOptional()
  reason?: string | null;
}

class ConsumerFlagRemoveBody {
  @Expose()
  @Type(() => Number)
  @IsNumber()
  version!: number;
}

@ApiCookieAuth()
@ApiTags(`Admin v2: Consumers`)
@Throttle({ default: { limit: 500, ttl: 60000 } })
@Controller(`admin-v2/consumers`)
export class AdminV2ConsumersController {
  constructor(
    private readonly service: AdminV2ConsumersService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  @Get()
  async listConsumers(@Identity() admin: IIdentityContext, @Query() query: AdminConsumersListQuery) {
    await this.accessService.assertCapability(admin, `consumers.read`);
    return this.service.listConsumers(query);
  }

  @Get(`:id`)
  async getConsumerCase(@Identity() admin: IIdentityContext, @Param(`id`) id: string) {
    await this.accessService.assertCapability(admin, `consumers.read`);
    return this.service.getConsumerCase(id);
  }

  @Get(`:id/contracts`)
  async getConsumerContracts(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Query() query: AdminConsumerPaginationQuery,
  ) {
    await this.accessService.assertCapability(admin, `consumers.read`);
    return this.service.getConsumerContracts(id, query);
  }

  @Get(`:id/ledger-summary`)
  async getConsumerLedgerSummary(@Identity() admin: IIdentityContext, @Param(`id`) id: string) {
    await this.accessService.assertCapability(admin, `consumers.read`);
    return this.service.getConsumerLedgerSummary(id);
  }

  @Get(`:id/auth-history`)
  async getConsumerAuthHistory(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Query() query: AdminConsumerDateRangeQuery,
  ) {
    await this.accessService.assertCapability(admin, `consumers.read`);
    return this.service.getConsumerAuthHistory(id, query);
  }

  @Get(`:id/action-log`)
  async getConsumerActionLog(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Query() query: AdminConsumerActionLogQuery,
  ) {
    await this.accessService.assertCapability(admin, `consumers.read`);
    return this.service.getConsumerActionLog(id, query);
  }

  @Post(`:id/notes`)
  async createNote(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: ConsumerNoteBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `consumers.notes`);
    return this.service.createNote(id, admin.id, body.content, meta);
  }

  @Post(`:id/flags`)
  async addFlag(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: ConsumerFlagBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `consumers.flags`);
    return this.service.addFlag(id, admin.id, body.flag, body.reason, meta);
  }

  @Patch(`:id/flags/:flagId/remove`)
  async removeFlag(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Param(`flagId`) flagId: string,
    @Body() body: ConsumerFlagRemoveBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `consumers.flags`);
    return this.service.removeFlag(id, flagId, admin.id, body.version, meta);
  }

  @Post(`:id/force-logout`)
  async forceLogout(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: ForceLogoutBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `consumers.force_logout`);
    return this.service.forceLogout(id, admin.id, body, meta);
  }

  @Post(`:id/suspend`)
  async suspendConsumer(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: SuspendConsumerBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `consumers.suspend`);
    return this.service.suspendConsumer(id, admin.id, body, meta);
  }

  @Post(`:id/email-resend`)
  async resendConsumerEmail(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: EmailResendBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `consumers.email_resend`);
    return this.service.resendConsumerEmail(id, admin.id, body, meta);
  }
}
