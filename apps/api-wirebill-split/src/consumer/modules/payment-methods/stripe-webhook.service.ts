import { Injectable } from '@nestjs/common';
import express from 'express';
import { InjectStripe } from 'nestjs-stripe';
import Stripe from 'stripe';

import { $Enums } from '@remoola/database';

import { envs } from '../../../envs';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class StripeWebhookService {
  constructor(
    private prisma: PrismaService,
    @InjectStripe() private stripe: Stripe,
  ) {}

  async handle(req: express.Request & { rawBody: string | Buffer<ArrayBufferLike> }, res: express.Response) {
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
      await this.handleStripeSuccess(session);
    }
  }

  private async handleStripeSuccess(session: Stripe.Checkout.Session) {
    const paymentRequestId = session.metadata?.paymentRequestId;

    if (!paymentRequestId) return;

    await this.prisma.transactionModel.updateMany({
      where: { paymentRequestId },
      data: {
        status: $Enums.TransactionStatus.COMPLETED,
        updatedBy: `stripe`,
      },
    });

    await this.prisma.paymentRequestModel.update({
      where: { id: paymentRequestId },
      data: {
        status: $Enums.TransactionStatus.COMPLETED,
        updatedBy: `stripe`,
      },
    });
  }
}
