import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Expose, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsString } from 'class-validator';
import express from 'express';

import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2PaymentMethodsService } from './admin-v2-payment-methods.service';

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

class DisablePaymentMethodBody {
  @Expose()
  @IsBoolean()
  confirmed!: boolean;

  @Expose()
  @IsString()
  reason!: string;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  version!: number;
}

class RemoveDefaultPaymentMethodBody {
  @Expose()
  @Type(() => Number)
  @IsNumber()
  version!: number;
}

class DuplicateEscalatePaymentMethodBody {
  @Expose()
  @Type(() => Number)
  @IsNumber()
  version!: number;
}

@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
@ApiTags(`Admin v2: Payment Methods`)
@Throttle({ default: { limit: 500, ttl: 60000 } })
@Controller(`admin-v2/payment-methods`)
export class AdminV2PaymentMethodsController {
  constructor(
    private readonly service: AdminV2PaymentMethodsService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  @Get()
  async listPaymentMethods(
    @Identity() admin: IIdentityContext,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    await this.accessService.assertCapability(admin, `payment_methods.read`);
    return this.service.listPaymentMethods({
      page: toNumber(one(query.page)),
      pageSize: toNumber(one(query.pageSize)),
      consumerId: one(query.consumerId),
      type: one(query.type),
      defaultSelected: toBoolean(one(query.defaultSelected)),
      fingerprint: one(query.fingerprint),
      includeDeleted: one(query.includeDeleted) === `true`,
    });
  }

  @Get(`:id`)
  async getPaymentMethodCase(@Identity() admin: IIdentityContext, @Param(`id`) id: string) {
    await this.accessService.assertCapability(admin, `payment_methods.read`);
    return this.service.getPaymentMethodCase(id);
  }

  @Post(`:id/disable`)
  async disablePaymentMethod(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: DisablePaymentMethodBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `payment_methods.manage`);
    return this.service.disablePaymentMethod(id, admin.id, body, requestMeta(req));
  }

  @Post(`:id/remove-default`)
  async removeDefaultPaymentMethod(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: RemoveDefaultPaymentMethodBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `payment_methods.manage`);
    return this.service.removeDefaultPaymentMethod(id, admin.id, body, requestMeta(req));
  }

  @Post(`:id/duplicate-escalate`)
  async duplicateEscalatePaymentMethod(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: DuplicateEscalatePaymentMethodBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `payment_methods.manage`);
    return this.service.escalateDuplicatePaymentMethod(id, admin.id, body, requestMeta(req));
  }
}
