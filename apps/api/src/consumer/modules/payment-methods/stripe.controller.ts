import { BadRequestException, Body, Controller, Param, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import express from 'express';

import { type ConsumerModel } from '@remoola/database-2';

import {
  ConfirmStripeSetupIntent,
  CreateStripeSetupIntentResponse,
  PayWithSavedPaymentMethod,
} from './dto/payment-method.dto';
import { ConsumerStripeService } from './stripe.service';
import { Identity } from '../../../common';

@ApiTags(`Consumer: stripe`)
@Controller(`consumer/stripe`)
export class ConsumerStripeController {
  constructor(private readonly service: ConsumerStripeService) {}

  @Post(`:paymentRequestId/stripe-session`)
  async createStripeSession(
    @Identity() consumer: ConsumerModel, //
    @Param(`paymentRequestId`) paymentRequestId: string,
    @Req() req: express.Request,
  ) {
    const frontendBaseUrl = req.get(`origin`);
    if (!frontendBaseUrl) throw new BadRequestException(`origin is required`);
    return this.service.createStripeSession(consumer.id, paymentRequestId, frontendBaseUrl);
  }

  @Post(`intents`)
  async createStripeSetupIntent(@Identity() consumer: ConsumerModel): Promise<CreateStripeSetupIntentResponse> {
    return this.service.createStripeSetupIntent(consumer.id);
  }

  @Post(`confirm`)
  async confirmStripeSetupIntent(
    @Identity() consumer: ConsumerModel, //
    @Body() body: ConfirmStripeSetupIntent,
  ) {
    return this.service.confirmStripeSetupIntent(consumer.id, body);
  }

  @Post(`payment-method/metadata`)
  async getPaymentMethodMetadata(@Body(`stripePaymentMethodId`) stripePaymentMethodId: string) {
    return this.service.getPaymentMethodMetadata(stripePaymentMethodId);
  }

  @Post(`:paymentRequestId/pay-with-saved-method`)
  async payWithSavedPaymentMethod(
    @Identity() consumer: ConsumerModel,
    @Param(`paymentRequestId`) paymentRequestId: string,
    @Body() body: PayWithSavedPaymentMethod,
  ) {
    return this.service.payWithSavedPaymentMethod(consumer.id, paymentRequestId, body);
  }
}
