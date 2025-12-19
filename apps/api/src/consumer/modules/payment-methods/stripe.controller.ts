import { BadRequestException, Controller, Param, Post, Req } from '@nestjs/common';
import express from 'express';

import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerStripeService } from './stripe.service';
import { Identity } from '../../../common';

@Controller(`consumer/stripe`)
export class ConsumerStripeController {
  constructor(private readonly service: ConsumerStripeService) {}

  @Post(`:paymentRequestId/stripe-session`)
  async createStripeSession(
    @Identity() consumer: ConsumerModel,
    @Param(`paymentRequestId`) paymentRequestId: string,
    @Req() req: express.Request,
  ) {
    const frontendBaseUrl = req.get(`origin`);
    if (!frontendBaseUrl) throw new BadRequestException(`origin is required`);
    return this.service.createStripeSession(consumer.id, paymentRequestId, frontendBaseUrl);
  }
}
