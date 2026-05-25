import { Controller, Post, Request, Res, type RawBodyRequest } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import express from 'express';

import { type ConsumerModel } from '@remoola/database-2';

import { StripeWebhookService } from './stripe-webhook.service';
import { Identity, PublicEndpoint } from '../../../../../common';

@ApiTags(`Consumer: webhooks`)
@Controller([`consumer/webhooks`, `consumer/webhook`])
export class StripeWebhookController {
  constructor(private service: StripeWebhookService) {}

  @Post()
  @PublicEndpoint()
  async processStripeEvent(
    @Request() req: RawBodyRequest<express.Request>,
    @Res() res: express.Response,
  ): Promise<void> {
    await this.service.processStripeEvent(req, res);
  }

  @Post(`stripe/verify/start`)
  async startVerifyMeStripeSession(@Identity() consumer: ConsumerModel) {
    return this.service.startVerifyMeStripeSession(consumer.id);
  }
}
