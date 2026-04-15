import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import express from 'express';

import { type AdminModel } from '@remoola/database-2';

import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity } from '../../common';
import { assertAdminV2Capability } from '../admin-v2-access';
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
  return {
    ipAddress: typeof ipAddress === `string` ? ipAddress : Array.isArray(ipAddress) ? ipAddress[0] : null,
    userAgent: typeof userAgent === `string` ? userAgent : null,
  };
}

@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
@ApiTags(`Admin v2: Consumers`)
@Controller(`admin-v2/consumers`)
export class AdminV2ConsumersController {
  constructor(private readonly service: AdminV2ConsumersService) {}

  @Get()
  listConsumers(@Identity() admin: AdminModel, @Query() query: Record<string, string | string[] | undefined>) {
    assertAdminV2Capability(admin, `consumers.read`);
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
  getConsumerCase(@Identity() admin: AdminModel, @Param(`id`) id: string) {
    assertAdminV2Capability(admin, `consumers.read`);
    return this.service.getConsumerCase(id);
  }

  @Get(`:id/contracts`)
  getConsumerContracts(
    @Identity() admin: AdminModel,
    @Param(`id`) id: string,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    assertAdminV2Capability(admin, `consumers.read`);
    const pageRaw = one(query.page);
    const pageSizeRaw = one(query.pageSize);
    return this.service.getConsumerContracts(id, {
      page: pageRaw != null && Number.isFinite(Number(pageRaw)) ? Number(pageRaw) : undefined,
      pageSize: pageSizeRaw != null && Number.isFinite(Number(pageSizeRaw)) ? Number(pageSizeRaw) : undefined,
      q: one(query.q),
    });
  }

  @Get(`:id/ledger-summary`)
  getConsumerLedgerSummary(@Identity() admin: AdminModel, @Param(`id`) id: string) {
    assertAdminV2Capability(admin, `consumers.read`);
    return this.service.getConsumerLedgerSummary(id);
  }

  @Get(`:id/auth-history`)
  getConsumerAuthHistory(
    @Identity() admin: AdminModel,
    @Param(`id`) id: string,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    assertAdminV2Capability(admin, `consumers.read`);
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
  getConsumerActionLog(
    @Identity() admin: AdminModel,
    @Param(`id`) id: string,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    assertAdminV2Capability(admin, `consumers.read`);
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
  createNote(
    @Identity() admin: AdminModel,
    @Param(`id`) id: string,
    @Body() body: { content?: string },
    @Req() req: express.Request,
  ) {
    assertAdminV2Capability(admin, `consumers.notes`);
    return this.service.createNote(id, admin.id, body.content ?? ``, requestMeta(req));
  }

  @Post(`:id/flags`)
  addFlag(
    @Identity() admin: AdminModel,
    @Param(`id`) id: string,
    @Body() body: { flag?: string; reason?: string | null },
    @Req() req: express.Request,
  ) {
    assertAdminV2Capability(admin, `consumers.flags`);
    return this.service.addFlag(id, admin.id, body.flag ?? ``, body.reason, requestMeta(req));
  }

  @Post(`:id/flags/:flagId/remove`)
  removeFlag(
    @Identity() admin: AdminModel,
    @Param(`id`) id: string,
    @Param(`flagId`) flagId: string,
    @Body() body: { version?: number | string },
    @Req() req: express.Request,
  ) {
    assertAdminV2Capability(admin, `consumers.flags`);
    const version = typeof body.version === `string` ? Number(body.version) : Number(body.version);
    return this.service.removeFlag(id, flagId, admin.id, version, requestMeta(req));
  }
}
