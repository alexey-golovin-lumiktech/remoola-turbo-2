import { Controller, Post, Request, Res, HttpCode, RawBodyRequest } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import express from 'express';

import { type ConsumerModel } from '@remoola/database';

import { StripeWebhookService } from './stripe-webhook.service';
import { Identity, PublicEndpoint } from '../../../common';

@ApiTags(`Consumer: webhooks`)
@Controller(`consumer/webhooks`)
export class StripeWebhookController {
  constructor(private service: StripeWebhookService) {}

  @Post()
  @PublicEndpoint()
  @HttpCode(200)
  processStripeEvent(@Request() req: RawBodyRequest<express.Request>, @Res() res: express.Response) {
    return this.service.processStripeEvent(req, res);
  }

  @Post(`stripe/verify/start`)
  async startVerifyMeStripeSession(@Identity() identity: ConsumerModel) {
    return this.service.startVerifyMeStripeSession(identity);
  }
}
