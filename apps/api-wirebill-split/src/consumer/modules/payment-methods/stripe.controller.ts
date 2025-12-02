import { Controller, Param, Post, Req } from '@nestjs/common';
import express from 'express';

import { ConsumerModel } from '@remoola/database';

import { ConsumerStripeService } from './stripe.service';
import { Identity } from '../../../common';

@Controller(`consumer/stripe`)
export class ConsumerStripeController {
  constructor(private readonly service: ConsumerStripeService) {}

  @Post(`:id/stripe-session`)
  async createStripeSession(@Identity() identity: ConsumerModel, @Param(`id`) id: string, @Req() req: express.Request) {
    return this.service.createStripeSession(identity.id, id, req.get(`referrer`));
  }
}
