import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Expose, Transform, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import express from 'express';

import { AdminAuthService } from '../../admin-auth/admin-auth.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2ExchangeService } from './admin-v2-exchange.service';

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

class VersionBody {
  @Expose()
  @Type(() => Number)
  @IsNumber()
  version!: number;
}

class StepUpVersionBody extends VersionBody {
  @Expose()
  @IsString()
  @MaxLength(256)
  passwordConfirmation!: string;
}

class ConfirmedVersionBody extends StepUpVersionBody {
  @Expose()
  @Transform(({ value }) => value === true || value === `true`)
  @IsBoolean()
  confirmed!: boolean;
}

class ApproveRateBody extends ConfirmedVersionBody {
  @Expose()
  @IsString()
  reason!: string;
}

class ExchangeListRatesQuery {
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
  fromCurrency?: string;

  @Expose()
  @IsString()
  @IsOptional()
  toCurrency?: string;

  @Expose()
  @IsString()
  @IsOptional()
  provider?: string;

  @Expose()
  @IsString()
  @IsOptional()
  status?: string;

  @Expose()
  @Transform(({ value }) =>
    value === true || value === `true` ? true : value === false || value === `false` ? false : undefined,
  )
  @IsBoolean()
  @IsOptional()
  stale?: boolean;
}

class ExchangeListRulesQuery {
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
  @Transform(({ value }) =>
    value === true || value === `true` ? true : value === false || value === `false` ? false : undefined,
  )
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @Expose()
  @IsString()
  @IsOptional()
  fromCurrency?: string;

  @Expose()
  @IsString()
  @IsOptional()
  toCurrency?: string;
}

class ExchangeListScheduledConversionsQuery {
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
  status?: string;
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
  async listRates(@Identity() admin: IIdentityContext, @Query() query: ExchangeListRatesQuery) {
    await this.accessService.assertCapability(admin, `exchange.read`);
    return this.service.listRates(query);
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
    @Body() body: ApproveRateBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `exchange.manage`);
    await this.adminAuthService.verifyStepUp(admin.id, body.passwordConfirmation);
    return this.service.approveRate(id, admin.id, body, requestMeta(req));
  }

  @Get(`rules`)
  async listRules(@Identity() admin: IIdentityContext, @Query() query: ExchangeListRulesQuery) {
    await this.accessService.assertCapability(admin, `exchange.read`);
    return this.service.listRules(query);
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
    @Body() body: VersionBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `exchange.manage`);
    return this.service.pauseRule(id, admin.id, body, requestMeta(req));
  }

  @Post(`rules/:id/resume`)
  async resumeRule(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: VersionBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `exchange.manage`);
    return this.service.resumeRule(id, admin.id, body, requestMeta(req));
  }

  @Post(`rules/:id/run-now`)
  async runRuleNow(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: StepUpVersionBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `exchange.manage`);
    await this.adminAuthService.verifyStepUp(admin.id, body.passwordConfirmation);
    return this.service.runRuleNow(id, admin.id, body, requestMeta(req));
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
  async getScheduledConversionCase(@Identity() admin: IIdentityContext, @Param(`id`) id: string) {
    await this.accessService.assertCapability(admin, `exchange.read`);
    return this.service.getScheduledConversionCase(id);
  }

  @Post(`scheduled/:id/force-execute`)
  async forceExecuteScheduledConversion(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: ConfirmedVersionBody,
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
    @Body() body: ConfirmedVersionBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `exchange.manage`);
    await this.adminAuthService.verifyStepUp(admin.id, body.passwordConfirmation);
    return this.service.cancelScheduledConversion(id, admin.id, body, requestMeta(req));
  }
}
