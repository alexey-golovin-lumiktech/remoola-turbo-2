import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Expose, Transform, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsString, MaxLength } from 'class-validator';
import express from 'express';

import { AdminAuthService } from '../../admin-auth/admin-auth.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2ExchangeService } from './admin-v2-exchange.service';

function one(value: string | string[] | undefined): string | undefined {
  return (typeof value === `string` ? value : value?.[0])?.trim() || undefined;
}

function toNumber(value: string | undefined): number | undefined {
  if (value == null) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toBoolean(value: string | undefined): boolean | undefined {
  if (value === `true`) return true;
  if (value === `false`) return false;
  return undefined;
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

class VersionBodyDTO {
  @Expose()
  @Type(() => Number)
  @IsNumber()
  version!: number;
}

class StepUpVersionBodyDTO extends VersionBodyDTO {
  @Expose()
  @IsString()
  @MaxLength(256)
  passwordConfirmation!: string;
}

class ConfirmedVersionBodyDTO extends StepUpVersionBodyDTO {
  @Expose()
  @Transform(({ value }) => value === true || value === `true`)
  @IsBoolean()
  confirmed!: boolean;
}

class ApproveRateBodyDTO extends ConfirmedVersionBodyDTO {
  @Expose()
  @IsString()
  reason!: string;
}

@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
@ApiTags(`Admin v2: Exchange`)
@Throttle({ default: { limit: 500, ttl: 60000 } })
@Controller(`admin-v2/exchange`)
export class AdminV2ExchangeController {
  constructor(
    private readonly service: AdminV2ExchangeService,
    private readonly accessService: AdminV2AccessService,
    private readonly adminAuthService: AdminAuthService,
  ) {}

  @Get(`rates`)
  async listRates(@Identity() admin: IIdentityContext, @Query() query: Record<string, string | string[] | undefined>) {
    await this.accessService.assertCapability(admin, `exchange.read`);
    return this.service.listRates({
      page: toNumber(one(query.page)),
      pageSize: toNumber(one(query.pageSize)),
      fromCurrency: one(query.fromCurrency),
      toCurrency: one(query.toCurrency),
      provider: one(query.provider),
      status: one(query.status),
      stale: toBoolean(one(query.stale)),
    });
  }

  @Get(`rates/:id`)
  async getRateCase(@Identity() admin: IIdentityContext, @Param(`id`) id: string) {
    await this.accessService.assertCapability(admin, `exchange.read`);
    return this.service.getRateCase(id);
  }

  @Post(`rates/:id/approve`)
  async approveRate(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: ApproveRateBodyDTO,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `exchange.manage`);
    await this.adminAuthService.verifyStepUp(admin.id, body.passwordConfirmation);
    return this.service.approveRate(id, admin.id, body, requestMeta(req));
  }

  @Get(`rules`)
  async listRules(@Identity() admin: IIdentityContext, @Query() query: Record<string, string | string[] | undefined>) {
    await this.accessService.assertCapability(admin, `exchange.read`);
    return this.service.listRules({
      page: toNumber(one(query.page)),
      pageSize: toNumber(one(query.pageSize)),
      q: one(query.q),
      enabled: toBoolean(one(query.enabled)),
      fromCurrency: one(query.fromCurrency),
      toCurrency: one(query.toCurrency),
    });
  }

  @Get(`rules/:id`)
  async getRuleCase(@Identity() admin: IIdentityContext, @Param(`id`) id: string) {
    await this.accessService.assertCapability(admin, `exchange.read`);
    return this.service.getRuleCase(id);
  }

  @Post(`rules/:id/pause`)
  async pauseRule(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: VersionBodyDTO,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `exchange.manage`);
    return this.service.pauseRule(id, admin.id, body, requestMeta(req));
  }

  @Post(`rules/:id/resume`)
  async resumeRule(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: VersionBodyDTO,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `exchange.manage`);
    return this.service.resumeRule(id, admin.id, body, requestMeta(req));
  }

  @Post(`rules/:id/run-now`)
  async runRuleNow(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: StepUpVersionBodyDTO,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `exchange.manage`);
    await this.adminAuthService.verifyStepUp(admin.id, body.passwordConfirmation);
    return this.service.runRuleNow(id, admin.id, body, requestMeta(req));
  }

  @Get(`scheduled`)
  async listScheduledConversions(
    @Identity() admin: IIdentityContext,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    await this.accessService.assertCapability(admin, `exchange.read`);
    return this.service.listScheduledConversions({
      page: toNumber(one(query.page)),
      pageSize: toNumber(one(query.pageSize)),
      q: one(query.q),
      status: one(query.status),
    });
  }

  @Get(`scheduled/:id`)
  async getScheduledConversionCase(@Identity() admin: IIdentityContext, @Param(`id`) id: string) {
    await this.accessService.assertCapability(admin, `exchange.read`);
    return this.service.getScheduledConversionCase(id);
  }

  @Post(`scheduled/:id/force-execute`)
  async forceExecuteScheduledConversion(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: ConfirmedVersionBodyDTO,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `exchange.manage`);
    await this.adminAuthService.verifyStepUp(admin.id, body.passwordConfirmation);
    return this.service.forceExecuteScheduledConversion(id, admin.id, body, requestMeta(req));
  }

  @Post(`scheduled/:id/cancel`)
  async cancelScheduledConversion(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: ConfirmedVersionBodyDTO,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `exchange.manage`);
    await this.adminAuthService.verifyStepUp(admin.id, body.passwordConfirmation);
    return this.service.cancelScheduledConversion(id, admin.id, body, requestMeta(req));
  }
}
