import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import express from 'express';

import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2PayoutsService } from './admin-v2-payouts.service';

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

class EscalatePayoutBodyDTO {
  @Expose()
  @IsBoolean()
  confirmed!: boolean;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  version!: number;

  @Expose()
  @IsOptional()
  @IsString()
  reason?: string;
}

@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
@ApiTags(`Admin v2: Payouts`)
@Controller(`admin-v2/payouts`)
export class AdminV2PayoutsController {
  constructor(
    private readonly service: AdminV2PayoutsService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  @Get()
  async listPayouts(
    @Identity() admin: IIdentityContext,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    await this.accessService.assertCapability(admin, `ledger.read`);
    return this.service.listPayouts({
      cursor: one(query.cursor),
      limit: toNumber(one(query.limit)),
    });
  }

  @Get(`:id`)
  async getPayoutCase(@Identity() admin: IIdentityContext, @Param(`id`) id: string) {
    await this.accessService.assertCapability(admin, `ledger.read`);
    return this.service.getPayoutCase(id);
  }

  @Post(`:id/escalate`)
  async escalatePayout(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: EscalatePayoutBodyDTO,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `payouts.escalate`);
    return this.service.escalatePayout(id, admin.id, body, requestMeta(req));
  }
}
