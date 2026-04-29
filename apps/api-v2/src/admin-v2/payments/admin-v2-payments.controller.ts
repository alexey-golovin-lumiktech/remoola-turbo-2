import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Expose } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { PAYMENT_REVERSAL_KIND } from '@remoola/api-types';

import { AdminAuthService } from '../../admin-auth/admin-auth.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2PaymentReversalService } from './admin-v2-payment-reversal.service';
import { AdminV2PaymentsService } from './admin-v2-payments.service';

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

function parseDate(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
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
  async listPaymentRequests(
    @Identity() admin: IIdentityContext,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    await this.accessService.assertCapability(admin, `payments.read`);
    return this.service.listPaymentRequests({
      cursor: one(query.cursor),
      limit: toNumber(one(query.limit)),
      q: one(query.q),
      status: one(query.status),
      paymentRail: one(query.paymentRail),
      currencyCode: one(query.currencyCode),
      amountMin: toNumber(one(query.amountMin)),
      amountMax: toNumber(one(query.amountMax)),
      dueDateFrom: parseDate(one(query.dueDateFrom)),
      dueDateTo: parseDate(one(query.dueDateTo)),
      createdFrom: parseDate(one(query.createdFrom)),
      createdTo: parseDate(one(query.createdTo)),
      overdue: one(query.overdue) === `true`,
    });
  }

  @Get(`operations-queue`)
  async getPaymentOperationsQueue(@Identity() admin: IIdentityContext) {
    await this.accessService.assertCapability(admin, `payments.read`);
    return this.service.getPaymentOperationsQueue();
  }

  @Get(`:id`)
  async getPaymentRequestCase(@Identity() admin: IIdentityContext, @Param(`id`) id: string) {
    await this.accessService.assertCapability(admin, `payments.read`);
    return this.service.getPaymentRequestCase(id);
  }

  @Post(`:id/refund`)
  async createRefund(@Identity() admin: IIdentityContext, @Param(`id`) id: string, @Body() body: PaymentReversalBody) {
    await this.adminAuthService.verifyStepUp(admin.id, body.passwordConfirmation);
    return this.adminPaymentReversalService.createReversal(
      id,
      { amount: body.amount, reason: body.reason, kind: PAYMENT_REVERSAL_KIND.REFUND },
      admin.id,
    );
  }

  @Post(`:id/chargeback`)
  async createChargeback(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: PaymentReversalBody,
  ) {
    await this.adminAuthService.verifyStepUp(admin.id, body.passwordConfirmation);
    return this.adminPaymentReversalService.createReversal(
      id,
      { amount: body.amount, reason: body.reason, kind: PAYMENT_REVERSAL_KIND.CHARGEBACK },
      admin.id,
    );
  }
}
