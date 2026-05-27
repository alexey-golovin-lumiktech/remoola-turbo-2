import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { AdminStepUpService } from '../../admin-auth/admin-step-up.service';
import {
  AdminV2ReadThrottle,
  Identity,
  type IIdentityContext,
  PlainObjectResponseContract,
  RequestMeta,
  type RequestMeta as RequestMetaPayload,
  UuidParam,
} from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import {
  ApproveRateBody,
  ConfirmedVersionBody,
  ExchangeListRatesWithPagingQuery,
  ExchangeListRulesQuery,
  ExchangeListScheduledConversionsQuery,
  StepUpVersionBody,
  VersionBody,
} from './admin-v2-exchange.dto';
import { AdminV2ExchangeService } from './admin-v2-exchange.service';

@ApiCookieAuth()
@ApiTags(`Admin v2: Exchange`)
@PlainObjectResponseContract(`Admin v2 exchange routes return plain objects governed by @remoola/api-types contracts.`)
@AdminV2ReadThrottle()
@Controller(`admin-v2/exchange`)
export class AdminV2ExchangeController {
  constructor(
    private readonly service: AdminV2ExchangeService,
    private readonly accessService: AdminV2AccessService,
    private readonly adminStepUp: AdminStepUpService,
  ) {}

  @Get(`rates`)
  async listRates(@Identity() admin: IIdentityContext, @Query() query: ExchangeListRatesWithPagingQuery) {
    await this.accessService.assertCapability(admin, `exchange.read`);
    return this.service.listRates(query);
  }

  @Get(`rates/:id`)
  async getRateCase(@Identity() admin: IIdentityContext, @UuidParam(`id`) id: string) {
    await this.accessService.assertCapability(admin, `exchange.read`);
    return this.service.getRateCase(id);
  }

  @Post(`rates/:id/approve`)
  async approveRate(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
    @Body() body: ApproveRateBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `exchange.manage`);
    await this.adminStepUp.verify(admin.id, body.passwordConfirmation);
    return this.service.approveRate(id, admin.id, body, meta);
  }

  @Get(`rules`)
  async listRules(@Identity() admin: IIdentityContext, @Query() query: ExchangeListRulesQuery) {
    await this.accessService.assertCapability(admin, `exchange.read`);
    return this.service.listRules(query);
  }

  @Get(`rules/:id`)
  async getRuleCase(@Identity() admin: IIdentityContext, @UuidParam(`id`) id: string) {
    await this.accessService.assertCapability(admin, `exchange.read`);
    return this.service.getRuleCase(id);
  }

  @Post(`rules/:id/pause`)
  async pauseRule(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
    @Body() body: VersionBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `exchange.manage`);
    return this.service.pauseRule(id, admin.id, body, meta);
  }

  @Post(`rules/:id/resume`)
  async resumeRule(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
    @Body() body: VersionBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `exchange.manage`);
    return this.service.resumeRule(id, admin.id, body, meta);
  }

  @Post(`rules/:id/run-now`)
  async runRuleNow(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
    @Body() body: StepUpVersionBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `exchange.manage`);
    await this.adminStepUp.verify(admin.id, body.passwordConfirmation);
    return this.service.runRuleNow(id, admin.id, body, meta);
  }

  @Get(`scheduled`)
  async listScheduledConversions(
    @Identity() admin: IIdentityContext,
    @Query() query: ExchangeListScheduledConversionsQuery,
  ) {
    await this.accessService.assertCapability(admin, `exchange.read`);
    return this.service.listScheduledConversions(query);
  }

  @Get(`scheduled/:id`)
  async getScheduledConversionCase(@Identity() admin: IIdentityContext, @UuidParam(`id`) id: string) {
    await this.accessService.assertCapability(admin, `exchange.read`);
    return this.service.getScheduledConversionCase(id);
  }

  @Post(`scheduled/:id/force-execute`)
  async forceExecuteScheduledConversion(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
    @Body() body: ConfirmedVersionBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `exchange.manage`);
    await this.adminStepUp.verify(admin.id, body.passwordConfirmation);
    return this.service.forceExecuteScheduledConversion(id, admin.id, body, meta);
  }

  @Post(`scheduled/:id/cancel`)
  async cancelScheduledConversion(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
    @Body() body: ConfirmedVersionBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `exchange.manage`);
    await this.adminStepUp.verify(admin.id, body.passwordConfirmation);
    return this.service.cancelScheduledConversion(id, admin.id, body, meta);
  }
}
