import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import {
  adminV2ConsumerCaseResponseSchema,
  adminV2ConsumerContractsResponseSchema,
  adminV2ConsumerLedgerSummaryResponseSchema,
  adminV2ConsumerTimelineResponseSchema,
  adminV2ConsumersListResponseSchema,
  type AdminV2ConsumerCaseResponse,
  type AdminV2ConsumerContractsResponse,
  type AdminV2ConsumerLedgerSummaryResponse,
  type AdminV2ConsumerTimelineResponse,
  type AdminV2ConsumersListResponse,
} from '@remoola/api-types';

import {
  AdminV2ReadThrottle,
  Identity,
  type IIdentityContext,
  PagingQuery,
  PlainObjectResponseContract,
  RequestMeta,
  type RequestMeta as RequestMetaPayload,
  UuidParam,
} from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { toAdminV2WireContract } from '../admin-v2-wire-contract';
import {
  AdminConsumerActionLogQuery,
  AdminConsumerDateRangeWithPagingQuery,
  AdminConsumersListQuery,
  ConsumerFlagBody,
  ConsumerFlagRemoveBody,
  ConsumerNoteBody,
  EmailResendBody,
  ForceLogoutBody,
  SuspendConsumerBody,
} from './admin-v2-consumers.dto';
import { AdminV2ConsumersService } from './admin-v2-consumers.service';

@ApiCookieAuth()
@ApiTags(`Admin v2: Consumers`)
@PlainObjectResponseContract(`Admin v2 consumer routes return plain objects governed by @remoola/api-types contracts.`)
@AdminV2ReadThrottle()
@Controller(`admin-v2/consumers`)
export class AdminV2ConsumersController {
  constructor(
    private readonly service: AdminV2ConsumersService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  @Get()
  async listConsumers(
    @Identity() admin: IIdentityContext,
    @Query() query: AdminConsumersListQuery,
  ): Promise<AdminV2ConsumersListResponse> {
    await this.accessService.assertCapability(admin, `consumers.read`);
    return toAdminV2WireContract(adminV2ConsumersListResponseSchema, await this.service.listConsumers(query));
  }

  @Get(`:id`)
  async getConsumerCase(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
  ): Promise<AdminV2ConsumerCaseResponse> {
    await this.accessService.assertCapability(admin, `consumers.read`);
    return toAdminV2WireContract(adminV2ConsumerCaseResponseSchema, await this.service.getConsumerCase(id));
  }

  @Get(`:id/contracts`)
  async getConsumerContracts(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
    @Query() query: PagingQuery,
  ): Promise<AdminV2ConsumerContractsResponse> {
    await this.accessService.assertCapability(admin, `consumers.read`);
    return toAdminV2WireContract(
      adminV2ConsumerContractsResponseSchema,
      await this.service.getConsumerContracts(id, query),
    );
  }

  @Get(`:id/ledger-summary`)
  async getConsumerLedgerSummary(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
  ): Promise<AdminV2ConsumerLedgerSummaryResponse> {
    await this.accessService.assertCapability(admin, `consumers.read`);
    return toAdminV2WireContract(
      adminV2ConsumerLedgerSummaryResponseSchema,
      await this.service.getConsumerLedgerSummary(id),
    );
  }

  @Get(`:id/auth-history`)
  async getConsumerAuthHistory(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
    @Query() query: AdminConsumerDateRangeWithPagingQuery,
  ): Promise<AdminV2ConsumerTimelineResponse> {
    await this.accessService.assertCapability(admin, `consumers.read`);
    return toAdminV2WireContract(
      adminV2ConsumerTimelineResponseSchema,
      await this.service.getConsumerAuthHistory(id, query),
    );
  }

  @Get(`:id/action-log`)
  async getConsumerActionLog(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
    @Query() query: AdminConsumerActionLogQuery,
  ): Promise<AdminV2ConsumerTimelineResponse> {
    await this.accessService.assertCapability(admin, `consumers.read`);
    return toAdminV2WireContract(
      adminV2ConsumerTimelineResponseSchema,
      await this.service.getConsumerActionLog(id, query),
    );
  }

  @Post(`:id/notes`)
  async createNote(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
    @Body() body: ConsumerNoteBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `consumers.notes`);
    return this.service.createNote(id, admin.id, body.content, meta);
  }

  @Post(`:id/flags`)
  async addFlag(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
    @Body() body: ConsumerFlagBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `consumers.flags`);
    return this.service.addFlag(id, admin.id, body.flag, body.reason, meta);
  }

  @Patch(`:id/flags/:flagId/remove`)
  async removeFlag(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
    @UuidParam(`flagId`) flagId: string,
    @Body() body: ConsumerFlagRemoveBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `consumers.flags`);
    return this.service.removeFlag(id, flagId, admin.id, body.version, meta);
  }

  @Post(`:id/force-logout`)
  async forceLogout(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
    @Body() body: ForceLogoutBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `consumers.force_logout`);
    return this.service.forceLogout(id, admin.id, body, meta);
  }

  @Post(`:id/suspend`)
  async suspendConsumer(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
    @Body() body: SuspendConsumerBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `consumers.suspend`);
    return this.service.suspendConsumer(id, admin.id, body, meta);
  }

  @Post(`:id/email-resend`)
  async resendConsumerEmail(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
    @Body() body: EmailResendBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `consumers.email_resend`);
    return this.service.resendConsumerEmail(id, admin.id, body, meta);
  }
}
