import { Injectable } from '@nestjs/common';
import express from 'express';
import { InjectStripe } from 'nestjs-stripe';
import Stripe from 'stripe';

import { $Enums, ConsumerModel } from '@remoola/database';

import { envs } from '../../../envs';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class StripeWebhookService {
  constructor(
    private prisma: PrismaService,
    @InjectStripe() private stripe: Stripe,
  ) {}

  async startVerifyMeStripeSession(identity: ConsumerModel) {
    const session = await this.stripe.identity.verificationSessions.create({
      type: `document`,
      metadata: { consumerId: identity.id }, // important
      options: {
        document: {
          allowed_types: [`passport`, `driving_license`, `id_card`],
          require_id_number: true,
          require_live_capture: true,
        },
      },
    });

    return { clientSecret: session.client_secret };
  }

  async processStripeEvent(
    req: express.Request & { rawBody: string | Buffer<ArrayBufferLike> },
    res: express.Response,
  ) {
    console.log(`\n************************************`);
    console.log(`processStripeEvent`);
    console.log(`envs.STRIPE_WEBHOOK_SECRET`, envs.STRIPE_WEBHOOK_SECRET);
    if (envs.STRIPE_WEBHOOK_SECRET === `STRIPE_WEBHOOK_SECRET`) return;
    if (!req.rawBody) return;

    try {
      const signature = req.headers[`stripe-signature`];
      const event = this.stripe.webhooks.constructEvent(req.rawBody, signature, envs.STRIPE_WEBHOOK_SECRET);
      console.log(`event.type`, event.type);
      console.log(`************************************\n`);
      switch (event.type) {
        case `identity.verification_session.verified`: {
          await this.handleVerified(event.data.object as any);
          break;
        }

        case `checkout.session.completed`: {
          const session = event.data.object as Stripe.Checkout.Session;
          await this.handleStripeSuccess(session);
          break;
        }

        default: {
          console.log(`received unhandled stripe event type: ${event.type}`);
          break;
        }
      }

      return res.json({ received: true });
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }
  }

  private async handleVerified(session: Stripe.Identity.VerificationSession) {
    const consumerId = session.metadata.consumerId;

    const doc = session.verified_outputs;

    await this.prisma.consumerModel.update({
      where: { id: consumerId },
      data: {
        legalVerified: true,
        personalDetails: {
          upsert: {
            create: {
              firstName: doc.first_name,
              lastName: doc.last_name,
              dateOfBirth: doc.dob ? new Date(doc.dob.year, doc.dob.month - 1, doc.dob.day) : null,
              citizenOf: doc.address?.country || null,
              passportOrIdNumber: null,
            },
            update: {
              firstName: doc.first_name,
              lastName: doc.last_name,
              dateOfBirth: doc.dob ? new Date(doc.dob.year, doc.dob.month - 1, doc.dob.day) : null,
              citizenOf: doc.address?.country || null,
            },
          },
        },
      },
    });
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
