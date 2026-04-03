import { BadRequestException, Body, Controller, Param, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import express from 'express';

import { type ConsumerModel } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import {
  ConfirmStripeSetupIntent,
  CreateStripeSetupIntentResponse,
  PayWithSavedPaymentMethod,
} from './dto/payment-method.dto';
import { ConsumerStripeService } from './stripe.service';
import { Identity, TrackConsumerAction } from '../../../common';
import { OriginResolverService } from '../../../shared/origin-resolver.service';

@ApiTags(`Consumer: stripe`)
@Controller(`consumer/stripe`)
export class ConsumerStripeController {
  private static readonly IDEMPOTENCY_KEY_MAX_LENGTH = 128;
  private static readonly IDEMPOTENCY_KEY_ALLOWED_REGEX = /^[A-Za-z0-9._:-]+$/;

  constructor(
    private readonly service: ConsumerStripeService,
    private readonly originResolver: OriginResolverService,
  ) {}

  private resolveIdempotencyKey(idempotencyHeader: string | undefined): string {
    const trimmed = idempotencyHeader?.trim();
    if (!trimmed) throw new BadRequestException(errorCodes.IDEMPOTENCY_KEY_REQUIRED_PAY_WITH_SAVED_METHOD);
    if (
      trimmed.length > ConsumerStripeController.IDEMPOTENCY_KEY_MAX_LENGTH ||
      !ConsumerStripeController.IDEMPOTENCY_KEY_ALLOWED_REGEX.test(trimmed)
    ) {
      throw new BadRequestException(errorCodes.IDEMPOTENCY_KEY_REQUIRED_PAY_WITH_SAVED_METHOD);
    }
    return trimmed;
  }

  @Post(`:paymentRequestId/stripe-session`)
  async createStripeSession(
    @Identity() consumer: ConsumerModel, //
    @Param(`paymentRequestId`) paymentRequestId: string,
    @Req() req: express.Request,
  ) {
    const frontendBaseUrl = this.originResolver.resolveConsumerOriginFromRequestScope(
      req.headers.origin,
      req.headers.referer,
    );
    if (!frontendBaseUrl) throw new BadRequestException(errorCodes.ORIGIN_REQUIRED);
    return this.service.createStripeSession(consumer.id, paymentRequestId, frontendBaseUrl);
  }

  @Post(`intents`)
  async createStripeSetupIntent(@Identity() consumer: ConsumerModel): Promise<CreateStripeSetupIntentResponse> {
    return this.service.createStripeSetupIntent(consumer.id);
  }

  @TrackConsumerAction({ action: `consumer.payments.confirm`, resource: `payments` })
  @Post(`confirm`)
  async confirmStripeSetupIntent(
    @Identity() consumer: ConsumerModel, //
    @Body() body: ConfirmStripeSetupIntent,
  ) {
    return this.service.confirmStripeSetupIntent(consumer.id, body);
  }

  @TrackConsumerAction({ action: `consumer.payments.pay_with_saved_method`, resource: `payments` })
  @Post(`:paymentRequestId/pay-with-saved-method`)
  async payWithSavedPaymentMethod(
    @Identity() consumer: ConsumerModel,
    @Param(`paymentRequestId`) paymentRequestId: string,
    @Body() body: PayWithSavedPaymentMethod,
    @Req() req: express.Request,
  ) {
    const idempotencyKey = this.resolveIdempotencyKey(req.get(`idempotency-key`));
    return this.service.payWithSavedPaymentMethod(consumer.id, paymentRequestId, body, idempotencyKey);
  }
}
