import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import {
  adminV2ExchangeRateCaseResponseSchema,
  adminV2ExchangeRatesListResponseSchema,
  adminV2ExchangeRuleCaseResponseSchema,
  adminV2ExchangeRulesListResponseSchema,
  adminV2ExchangeScheduledCaseResponseSchema,
  adminV2ExchangeScheduledListResponseSchema,
  type AdminV2ExchangeRateCaseResponse,
  type AdminV2ExchangeRatesListResponse,
  type AdminV2ExchangeRuleCaseResponse,
  type AdminV2ExchangeRulesListResponse,
  type AdminV2ExchangeScheduledCaseResponse,
  type AdminV2ExchangeScheduledListResponse,
} from '@remoola/api-types';

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
import { toAdminV2WireContract } from '../admin-v2-wire-contract';
import {
  ApproveRateBody,
  CancelScheduledExchangeBody,
  ExchangeListRatesWithPagingQuery,
  ExchangeListRulesQuery,
  ExchangeListScheduledConversionsQuery,
  ForceExecuteScheduledExchangeBody,
  PauseExchangeRuleBody,
  ResumeExchangeRuleBody,
  RunExchangeRuleBody,
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
  async listRates(
    @Identity() admin: IIdentityContext,
    @Query() query: ExchangeListRatesWithPagingQuery,
  ): Promise<AdminV2ExchangeRatesListResponse> {
    await this.accessService.assertCapability(admin, `exchange.read`);
    return toAdminV2WireContract(adminV2ExchangeRatesListResponseSchema, await this.service.listRates(query));
  }

  @Get(`rates/:id`)
  async getRateCase(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
  ): Promise<AdminV2ExchangeRateCaseResponse> {
    await this.accessService.assertCapability(admin, `exchange.read`);
    return toAdminV2WireContract(adminV2ExchangeRateCaseResponseSchema, await this.service.getRateCase(id));
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
  async listRules(
    @Identity() admin: IIdentityContext,
    @Query() query: ExchangeListRulesQuery,
  ): Promise<AdminV2ExchangeRulesListResponse> {
    await this.accessService.assertCapability(admin, `exchange.read`);
    return toAdminV2WireContract(adminV2ExchangeRulesListResponseSchema, await this.service.listRules(query));
  }

  @Get(`rules/:id`)
  async getRuleCase(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
  ): Promise<AdminV2ExchangeRuleCaseResponse> {
    await this.accessService.assertCapability(admin, `exchange.read`);
    return toAdminV2WireContract(adminV2ExchangeRuleCaseResponseSchema, await this.service.getRuleCase(id));
  }

  @Post(`rules/:id/pause`)
  async pauseRule(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
    @Body() body: PauseExchangeRuleBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `exchange.manage`);
    return this.service.pauseRule(id, admin.id, body, meta);
  }

  @Post(`rules/:id/resume`)
  async resumeRule(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
    @Body() body: ResumeExchangeRuleBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `exchange.manage`);
    return this.service.resumeRule(id, admin.id, body, meta);
  }

  @Post(`rules/:id/run-now`)
  async runRuleNow(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
    @Body() body: RunExchangeRuleBody,
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
  ): Promise<AdminV2ExchangeScheduledListResponse> {
    await this.accessService.assertCapability(admin, `exchange.read`);
    return toAdminV2WireContract(
      adminV2ExchangeScheduledListResponseSchema,
      await this.service.listScheduledConversions(query),
    );
  }

  @Get(`scheduled/:id`)
  async getScheduledConversionCase(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
  ): Promise<AdminV2ExchangeScheduledCaseResponse> {
    await this.accessService.assertCapability(admin, `exchange.read`);
    return toAdminV2WireContract(
      adminV2ExchangeScheduledCaseResponseSchema,
      await this.service.getScheduledConversionCase(id),
    );
  }

  @Post(`scheduled/:id/force-execute`)
  async forceExecuteScheduledConversion(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
    @Body() body: ForceExecuteScheduledExchangeBody,
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
    @Body() body: CancelScheduledExchangeBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `exchange.manage`);
    await this.adminStepUp.verify(admin.id, body.passwordConfirmation);
    return this.service.cancelScheduledConversion(id, admin.id, body, meta);
  }
}
