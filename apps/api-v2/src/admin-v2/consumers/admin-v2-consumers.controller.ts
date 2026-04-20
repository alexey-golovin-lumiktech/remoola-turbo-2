import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsBoolean, IsIn, IsString } from 'class-validator';
import express from 'express';

import { CONSUMER_APP_SCOPES } from '@remoola/api-types';

import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2ConsumersService } from './admin-v2-consumers.service';

function one(value: string | string[] | undefined): string | undefined {
  return (typeof value === `string` ? value : value?.[0])?.trim() || undefined;
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function requestMeta(req: express.Request) {
  const ipAddress = req.ip ?? req.headers[`x-forwarded-for`];
  const userAgent = req.headers[`user-agent`];
  const idempotencyKey = req.headers[`idempotency-key`];
  return {
    ipAddress: typeof ipAddress === `string` ? ipAddress : Array.isArray(ipAddress) ? ipAddress[0] : null,
    userAgent: typeof userAgent === `string` ? userAgent : null,
    idempotencyKey:
      typeof idempotencyKey === `string` ? idempotencyKey : Array.isArray(idempotencyKey) ? idempotencyKey[0] : null,
  };
}

class ForceLogoutBodyDTO {
  @Expose()
  @IsBoolean()
  confirmed!: boolean;
}

class SuspendConsumerBodyDTO {
  @Expose()
  @IsBoolean()
  confirmed!: boolean;

  @Expose()
  @IsString()
  reason!: string;
}

class EmailResendBodyDTO {
  @Expose()
  @IsIn([`signup_verification`, `password_recovery`])
  emailKind!: `signup_verification` | `password_recovery`;

  @Expose()
  @IsIn(CONSUMER_APP_SCOPES)
  appScope!: (typeof CONSUMER_APP_SCOPES)[number];
}

@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
@ApiTags(`Admin v2: Consumers`)
@Controller(`admin-v2/consumers`)
export class AdminV2ConsumersController {
  constructor(
    private readonly service: AdminV2ConsumersService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  @Get()
  async listConsumers(
    @Identity() admin: IIdentityContext,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    await this.accessService.assertCapability(admin, `consumers.read`);
    const pageRaw = one(query.page);
    const pageSizeRaw = one(query.pageSize);
    return this.service.listConsumers({
      page: pageRaw != null && Number.isFinite(Number(pageRaw)) ? Number(pageRaw) : undefined,
      pageSize: pageSizeRaw != null && Number.isFinite(Number(pageSizeRaw)) ? Number(pageSizeRaw) : undefined,
      q: one(query.q),
      accountType: one(query.accountType),
      contractorKind: one(query.contractorKind),
      verificationStatus: one(query.verificationStatus),
      includeDeleted: one(query.includeDeleted) === `true`,
    });
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
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    await this.accessService.assertCapability(admin, `consumers.read`);
    const pageRaw = one(query.page);
    const pageSizeRaw = one(query.pageSize);
    return this.service.getConsumerContracts(id, {
      page: pageRaw != null && Number.isFinite(Number(pageRaw)) ? Number(pageRaw) : undefined,
      pageSize: pageSizeRaw != null && Number.isFinite(Number(pageSizeRaw)) ? Number(pageSizeRaw) : undefined,
      q: one(query.q),
    });
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
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    await this.accessService.assertCapability(admin, `consumers.read`);
    const pageRaw = one(query.page);
    const pageSizeRaw = one(query.pageSize);
    return this.service.getConsumerAuthHistory(id, {
      page: pageRaw != null && Number.isFinite(Number(pageRaw)) ? Number(pageRaw) : undefined,
      pageSize: pageSizeRaw != null && Number.isFinite(Number(pageSizeRaw)) ? Number(pageSizeRaw) : undefined,
      dateFrom: parseDate(one(query.dateFrom)),
      dateTo: parseDate(one(query.dateTo)),
    });
  }

  @Get(`:id/action-log`)
  async getConsumerActionLog(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    await this.accessService.assertCapability(admin, `consumers.read`);
    const pageRaw = one(query.page);
    const pageSizeRaw = one(query.pageSize);
    return this.service.getConsumerActionLog(id, {
      page: pageRaw != null && Number.isFinite(Number(pageRaw)) ? Number(pageRaw) : undefined,
      pageSize: pageSizeRaw != null && Number.isFinite(Number(pageSizeRaw)) ? Number(pageSizeRaw) : undefined,
      dateFrom: parseDate(one(query.dateFrom)),
      dateTo: parseDate(one(query.dateTo)),
      action: one(query.action),
    });
  }

  @Post(`:id/notes`)
  async createNote(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: { content?: string },
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `consumers.notes`);
    return this.service.createNote(id, admin.id, body.content ?? ``, requestMeta(req));
  }

  @Post(`:id/flags`)
  async addFlag(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: { flag?: string; reason?: string | null },
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `consumers.flags`);
    return this.service.addFlag(id, admin.id, body.flag ?? ``, body.reason, requestMeta(req));
  }

  @Patch(`:id/flags/:flagId/remove`)
  async removeFlag(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Param(`flagId`) flagId: string,
    @Body() body: { version?: number | string },
    @Req() req: express.Request,
  ) {
    const version = typeof body.version === `string` ? Number(body.version) : Number(body.version);
    await this.accessService.assertCapability(admin, `consumers.flags`);
    return this.service.removeFlag(id, flagId, admin.id, version, requestMeta(req));
  }

  @Post(`:id/force-logout`)
  async forceLogout(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: ForceLogoutBodyDTO,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `consumers.force_logout`);
    return this.service.forceLogout(id, admin.id, body, requestMeta(req));
  }

  @Post(`:id/suspend`)
  async suspendConsumer(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: SuspendConsumerBodyDTO,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `consumers.suspend`);
    return this.service.suspendConsumer(id, admin.id, body, requestMeta(req));
  }

  @Post(`:id/email-resend`)
  async resendConsumerEmail(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: EmailResendBodyDTO,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `consumers.email_resend`);
    return this.service.resendConsumerEmail(id, admin.id, body, requestMeta(req));
  }
}
