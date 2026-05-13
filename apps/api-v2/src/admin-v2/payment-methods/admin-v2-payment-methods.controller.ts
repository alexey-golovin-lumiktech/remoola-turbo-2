import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCookieAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Expose, Transform, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import express from 'express';

import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { optionalBooleanQuery, optionalNumberQuery, optionalStringQuery } from '../admin-v2-query-transforms';
import { AdminV2PaymentMethodsService } from './admin-v2-payment-methods.service';

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

class PaymentMethodsListQuery {
  @Expose()
  @Transform(({ obj, key }) => optionalNumberQuery((obj as Record<string, unknown>)[key]))
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @Expose()
  @Transform(({ obj, key }) => optionalNumberQuery((obj as Record<string, unknown>)[key]))
  @IsNumber()
  @Min(1)
  @IsOptional()
  pageSize?: number;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  consumerId?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  type?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalBooleanQuery((obj as Record<string, unknown>)[key]))
  @IsBoolean()
  @IsOptional()
  defaultSelected?: boolean;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  fingerprint?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalBooleanQuery((obj as Record<string, unknown>)[key]))
  @IsBoolean()
  @IsOptional()
  includeDeleted?: boolean;
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
  @ApiQuery({ name: `page`, required: false, type: Number })
  @ApiQuery({ name: `pageSize`, required: false, type: Number })
  @ApiQuery({ name: `consumerId`, required: false })
  @ApiQuery({ name: `type`, required: false })
  @ApiQuery({ name: `defaultSelected`, required: false, type: Boolean })
  @ApiQuery({ name: `fingerprint`, required: false })
  @ApiQuery({ name: `includeDeleted`, required: false, type: Boolean })
  @ApiBadRequestResponse({ description: `Invalid query parameter shape or type.` })
  async listPaymentMethods(@Identity() admin: IIdentityContext, @Query() query: PaymentMethodsListQuery) {
    await this.accessService.assertCapability(admin, `payment_methods.read`);
    return this.service.listPaymentMethods({
      page: query.page,
      pageSize: query.pageSize,
      consumerId: query.consumerId,
      type: query.type,
      defaultSelected: query.defaultSelected,
      fingerprint: query.fingerprint,
      includeDeleted: query.includeDeleted === true,
    });
  }

  @Get(`:id`)
  @ApiParam({ name: `id`, format: `uuid`, description: `Payment method id` })
  @ApiBadRequestResponse({ description: `Invalid payment method id.` })
  async getPaymentMethodCase(@Identity() admin: IIdentityContext, @Param(`id`, ParseUUIDPipe) id: string) {
    await this.accessService.assertCapability(admin, `payment_methods.read`);
    return this.service.getPaymentMethodCase(id);
  }

  @Post(`:id/disable`)
  @ApiParam({ name: `id`, format: `uuid`, description: `Payment method id` })
  @ApiBadRequestResponse({ description: `Invalid payment method id or disable body.` })
  async disablePaymentMethod(
    @Identity() admin: IIdentityContext,
    @Param(`id`, ParseUUIDPipe) id: string,
    @Body() body: DisablePaymentMethodBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `payment_methods.manage`);
    return this.service.disablePaymentMethod(id, admin.id, body, requestMeta(req));
  }

  @Post(`:id/remove-default`)
  @ApiParam({ name: `id`, format: `uuid`, description: `Payment method id` })
  @ApiBadRequestResponse({ description: `Invalid payment method id or remove-default body.` })
  async removeDefaultPaymentMethod(
    @Identity() admin: IIdentityContext,
    @Param(`id`, ParseUUIDPipe) id: string,
    @Body() body: RemoveDefaultPaymentMethodBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `payment_methods.manage`);
    return this.service.removeDefaultPaymentMethod(id, admin.id, body, requestMeta(req));
  }

  @Post(`:id/duplicate-escalate`)
  @ApiParam({ name: `id`, format: `uuid`, description: `Payment method id` })
  @ApiBadRequestResponse({ description: `Invalid payment method id or duplicate-escalate body.` })
  async duplicateEscalatePaymentMethod(
    @Identity() admin: IIdentityContext,
    @Param(`id`, ParseUUIDPipe) id: string,
    @Body() body: DuplicateEscalatePaymentMethodBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `payment_methods.manage`);
    return this.service.escalateDuplicatePaymentMethod(id, admin.id, body, requestMeta(req));
  }
}
