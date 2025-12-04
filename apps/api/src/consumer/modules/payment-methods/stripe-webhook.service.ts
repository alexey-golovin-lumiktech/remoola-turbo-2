import { Injectable, type RawBodyRequest } from '@nestjs/common';
import express from 'express';
import { InjectStripe } from 'nestjs-stripe';
import Stripe from 'stripe';

import { $Enums, type ConsumerModel } from '@remoola/database';

import { STRIPE_EVENT } from './events';
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

  async processStripeEvent(req: RawBodyRequest<express.Request>, res: express.Response) {
    if (envs.STRIPE_WEBHOOK_SECRET === `STRIPE_WEBHOOK_SECRET`) return;
    if (!req.rawBody) return;

    try {
      const signature = req.headers[`stripe-signature`];
      const event = this.stripe.webhooks.constructEvent(req.rawBody, signature, envs.STRIPE_WEBHOOK_SECRET);

      switch (event.type) {
        case STRIPE_EVENT.IDENTITY_VERIFICATION_SESSION_VERIFIED: {
          console.log(`[INIT] ${event.type}`);
          await this.handleVerified(event.data.object);
          console.log(`[DONE] ${event.type}`);
          break;
        }

        case STRIPE_EVENT.CHECKOUT_SESSION_COMPLETED: {
          console.log(`[INIT] ${event.type}`);
          await this.handleStripeSuccess(event.data.object);
          console.log(`[DONE] ${event.type}`);
          break;
        }

        default: {
          console.log(`[SKIP] ${event.type}`);
          break;
        }
      }

      res.json({ received: true });
      return;
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }
  }

  private async handleVerified(session: Stripe.Identity.VerificationSession) {
    const consumerId = session.metadata?.consumerId;
    if (!consumerId) {
      console.error(`NO consumerId: ${consumerId}`);
      return;
    }

    const consumer = await this.prisma.consumerModel.findFirst({
      where: { id: consumerId },
      include: { personalDetails: true },
    });
    if (!consumer) {
      console.error(`NO consumer for id: ${consumerId}`);
      return;
    }

    let personalDetails;
    if (session.verified_outputs) {
      const doc = session.verified_outputs;

      const data = {
        firstName: doc.first_name,
        lastName: doc.last_name,
        dateOfBirth: doc.dob ? new Date(doc.dob.year, doc.dob.month - 1, doc.dob.day) : null,
        citizenOf: doc.address?.country || null,
        passportOrIdNumber: null,
      };

      personalDetails = { upsert: { create: data, update: data } };
    }

    return await this.prisma.consumerModel.update({
      where: { id: consumer.id },
      data: { legalVerified: true, ...(personalDetails && { personalDetails }) },
      include: { personalDetails: !!personalDetails },
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
