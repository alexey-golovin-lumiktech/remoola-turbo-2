import { Controller, Post, Req, Res, HttpCode } from '@nestjs/common';
import { InjectStripe } from 'nestjs-stripe';
import Stripe from 'stripe';

import { ConsumerPaymentsService } from './consumer-payments.service';
import { envs } from '../../../envs';

@Controller(`webhooks/stripe`)
export class StripeWebhookController {
  constructor(
    @InjectStripe() private stripe: Stripe,
    private payments: ConsumerPaymentsService,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(@Req() req, @Res() res) {
    let event: Stripe.Event;

    try {
      const signature = req.headers[`stripe-signature`];
      event = this.stripe.webhooks.constructEvent(
        req.rawBody, // IMPORTANT: raw body needed
        signature,
        envs.STRIPE_SECRET_KEY!,
      );
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Payment completed
    if (event.type === `checkout.session.completed`) {
      const session = event.data.object as Stripe.Checkout.Session;
      await this.payments.handleStripeSuccess(session);
    }

    res.json({ received: true });
  }
}
