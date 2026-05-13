import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCookieAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Expose, Transform } from 'class-transformer';
import { IsBoolean, IsDate, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { PAYMENT_REVERSAL_KIND } from '@remoola/api-types';

import { AdminAuthService } from '../../admin-auth/admin-auth.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import {
  optionalBooleanQuery,
  optionalDateQuery,
  optionalNumberQuery,
  optionalStringQuery,
} from '../admin-v2-query-transforms';
import { AdminV2PaymentReversalService } from './admin-v2-payment-reversal.service';
import { AdminV2PaymentsService } from './admin-v2-payments.service';

class PaymentRequestsQuery {
  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsOptional()
  @IsString()
  cursor?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalNumberQuery((obj as Record<string, unknown>)[key]))
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsOptional()
  @IsString()
  q?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsOptional()
  @IsString()
  status?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsOptional()
  @IsString()
  paymentRail?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalNumberQuery((obj as Record<string, unknown>)[key]))
  @IsOptional()
  @IsNumber()
  amountMin?: number;

  @Expose()
  @Transform(({ obj, key }) => optionalNumberQuery((obj as Record<string, unknown>)[key]))
  @IsOptional()
  @IsNumber()
  amountMax?: number;

  @Expose()
  @Transform(({ obj, key }) => optionalDateQuery((obj as Record<string, unknown>)[key]))
  @IsOptional()
  @IsDate()
  dueDateFrom?: Date;

  @Expose()
  @Transform(({ obj, key }) => optionalDateQuery((obj as Record<string, unknown>)[key]))
  @IsOptional()
  @IsDate()
  dueDateTo?: Date;

  @Expose()
  @Transform(({ obj, key }) => optionalDateQuery((obj as Record<string, unknown>)[key]))
  @IsOptional()
  @IsDate()
  createdFrom?: Date;

  @Expose()
  @Transform(({ obj, key }) => optionalDateQuery((obj as Record<string, unknown>)[key]))
  @IsOptional()
  @IsDate()
  createdTo?: Date;

  @Expose()
  @Transform(({ obj, key }) => optionalBooleanQuery((obj as Record<string, unknown>)[key]))
  @IsOptional()
  @IsBoolean()
  overdue?: boolean;
}

class PaymentReversalBody {
  @Expose()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @Expose()
  @IsString()
  @MaxLength(256)
  passwordConfirmation!: string;
}

@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
@ApiTags(`Admin v2: Payments`)
@Throttle({ default: { limit: 500, ttl: 60000 } })
@Controller(`admin-v2/payments`)
export class AdminV2PaymentsController {
  constructor(
    private readonly service: AdminV2PaymentsService,
    private readonly accessService: AdminV2AccessService,
    private readonly adminAuthService: AdminAuthService,
    private readonly adminPaymentReversalService: AdminV2PaymentReversalService,
  ) {}

  @Get()
  @ApiQuery({ name: `cursor`, required: false })
  @ApiQuery({ name: `limit`, required: false, type: Number })
  @ApiQuery({ name: `q`, required: false })
  @ApiQuery({ name: `status`, required: false })
  @ApiQuery({ name: `paymentRail`, required: false })
  @ApiQuery({ name: `currencyCode`, required: false })
  @ApiQuery({ name: `amountMin`, required: false, type: Number })
  @ApiQuery({ name: `amountMax`, required: false, type: Number })
  @ApiQuery({ name: `dueDateFrom`, required: false })
  @ApiQuery({ name: `dueDateTo`, required: false })
  @ApiQuery({ name: `createdFrom`, required: false })
  @ApiQuery({ name: `createdTo`, required: false })
  @ApiQuery({ name: `overdue`, required: false, type: Boolean })
  @ApiBadRequestResponse({ description: `Invalid query parameter shape or type.` })
  async listPaymentRequests(@Identity() admin: IIdentityContext, @Query() query: PaymentRequestsQuery) {
    await this.accessService.assertCapability(admin, `payments.read`);
    return this.service.listPaymentRequests({
      cursor: query.cursor,
      limit: query.limit,
      q: query.q,
      status: query.status,
      paymentRail: query.paymentRail,
      currencyCode: query.currencyCode,
      amountMin: query.amountMin,
      amountMax: query.amountMax,
      dueDateFrom: query.dueDateFrom,
      dueDateTo: query.dueDateTo,
      createdFrom: query.createdFrom,
      createdTo: query.createdTo,
      overdue: query.overdue === true,
    });
  }

  @Get(`operations-queue`)
  async getPaymentOperationsQueue(@Identity() admin: IIdentityContext) {
    await this.accessService.assertCapability(admin, `payments.read`);
    return this.service.getPaymentOperationsQueue();
  }

  @Get(`:id`)
  @ApiParam({ name: `id`, format: `uuid`, description: `Payment request id` })
  @ApiBadRequestResponse({ description: `Invalid payment request id.` })
  async getPaymentRequestCase(@Identity() admin: IIdentityContext, @Param(`id`, ParseUUIDPipe) id: string) {
    await this.accessService.assertCapability(admin, `payments.read`);
    return this.service.getPaymentRequestCase(id);
  }

  @Post(`:id/refund`)
  @ApiParam({ name: `id`, format: `uuid`, description: `Payment request id` })
  @ApiBadRequestResponse({ description: `Invalid payment request id or refund body.` })
  async createRefund(
    @Identity() admin: IIdentityContext,
    @Param(`id`, ParseUUIDPipe) id: string,
    @Body() body: PaymentReversalBody,
  ) {
    await this.accessService.assertCapability(admin, `payments.reverse`);
    await this.adminAuthService.verifyStepUp(admin.id, body.passwordConfirmation);
    return this.adminPaymentReversalService.createReversal(
      id,
      { amount: body.amount, reason: body.reason, kind: PAYMENT_REVERSAL_KIND.REFUND },
      admin.id,
    );
  }

  @Post(`:id/chargeback`)
  @ApiParam({ name: `id`, format: `uuid`, description: `Payment request id` })
  @ApiBadRequestResponse({ description: `Invalid payment request id or chargeback body.` })
  async createChargeback(
    @Identity() admin: IIdentityContext,
    @Param(`id`, ParseUUIDPipe) id: string,
    @Body() body: PaymentReversalBody,
  ) {
    await this.accessService.assertCapability(admin, `payments.reverse`);
    await this.adminAuthService.verifyStepUp(admin.id, body.passwordConfirmation);
    return this.adminPaymentReversalService.createReversal(
      id,
      { amount: body.amount, reason: body.reason, kind: PAYMENT_REVERSAL_KIND.CHARGEBACK },
      admin.id,
    );
  }
}
