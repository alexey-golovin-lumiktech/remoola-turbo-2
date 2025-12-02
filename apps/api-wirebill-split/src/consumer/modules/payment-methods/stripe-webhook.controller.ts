import { Controller, Post, Req, Res, HttpCode, Headers } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import express from 'express';

import { ConsumerModel } from '@remoola/database';

import { StripeWebhookService } from './stripe-webhook.service';
import { Identity, PublicEndpoint } from '../../../common';

@ApiTags(`Consumer: webhooks`)
@Controller(`consumer/webhooks`)
export class StripeWebhookController {
  constructor(private service: StripeWebhookService) {}

  @Post()
  @PublicEndpoint()
  @HttpCode(200)
  async handleCheckoutSessionCompleted(
    @Req() req: express.Request & { rawBody: string | Buffer<ArrayBufferLike> },
    @Res() res: express.Response,
  ) {
    await this.service.processStripeEvent(req, res);
    res.json({ received: true });
  }

  @Post(`stripe/verify/start`)
  async startVerifyMeStripeSession(@Identity() identity: ConsumerModel) {
    return this.service.startVerifyMeStripeSession(identity);
  }
}
