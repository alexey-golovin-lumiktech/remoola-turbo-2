import { Controller, Post, Req, Res, HttpCode } from '@nestjs/common';
import express from 'express';

import { StripeWebhookService } from './stripe-webhook.service';
import { PublicEndpoint } from '../../../common';

@Controller(`webhooks/stripe`)
export class StripeWebhookController {
  constructor(private service: StripeWebhookService) {}

  @Post()
  @PublicEndpoint()
  @HttpCode(200)
  async handle(
    @Req() req: express.Request & { rawBody: string | Buffer<ArrayBufferLike> },
    @Res() res: express.Response,
  ) {
    await this.service.handle(req, res);
    res.json({ received: true });
  }
}
