import { BadRequestException, Controller, Param, Post, Req } from '@nestjs/common';
import express from 'express';

import { ConsumerModel } from '@remoola/database';

import { ConsumerStripeService } from './stripe.service';
import { Identity } from '../../../common';

@Controller(`consumer/stripe`)
export class ConsumerStripeController {
  constructor(private readonly service: ConsumerStripeService) {}

  @Post(`:id/stripe-session`)
  async createStripeSession(@Identity() identity: ConsumerModel, @Param(`id`) id: string, @Req() req: express.Request) {
    const frontendBaseUrl = req.get(`origin`);
    if (!frontendBaseUrl) throw new BadRequestException(`origin is required`);
    return this.service.createStripeSession(identity.id, id, frontendBaseUrl);
  }
}
