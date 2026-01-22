import { BadRequestException, Injectable, type RawBodyRequest } from '@nestjs/common';
import express from 'express';
import Stripe from 'stripe';

import { $Enums } from '@remoola/database-2';

import { STRIPE_EVENT } from './events';
import { envs } from '../../../envs';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class StripeWebhookService {
  private stripe: Stripe;

  constructor(private prisma: PrismaService) {
    this.stripe = new Stripe(envs.STRIPE_SECRET_KEY, { apiVersion: `2025-11-17.clover` });

    // ONE-TIME MIGRATION: Attach existing payment methods to customer
    // This fixes payment methods collected before customer attachment was implemented
    // TODO: Remove this code after migration completes (check logs for completion)
    // this.runPaymentMethodMigration();
  }

  async startVerifyMeStripeSession(consumerId: string) {
    const session = await this.stripe.identity.verificationSessions.create({
      type: `document`,
      metadata: { consumerId }, // important
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

        case `payout.paid`:
          await this.handlePayoutPaid(event);
          break;
        case `payout.failed`:
        case `payout.canceled`:
          await this.handlePayoutFailed(event);
          break;

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

  private async handlePayoutPaid(event: Stripe.Event) {
    const payout = event.data.object as Stripe.Payout;

    if (!payout.metadata?.transactionId) return;

    await this.prisma.ledgerEntryModel.updateMany({
      where: { id: payout.metadata.transactionId },
      data: { status: $Enums.TransactionStatus.COMPLETED },
    });
  }

  private async handlePayoutFailed(event: Stripe.Event) {
    const payout = event.data.object as Stripe.Payout;

    if (!payout.metadata?.transactionId) return;

    await this.prisma.ledgerEntryModel.updateMany({
      where: { id: payout.metadata.transactionId },
      data: { status: $Enums.TransactionStatus.DENIED },
    });
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
    const consumerId = session.metadata?.consumerId;

    if (!paymentRequestId || !consumerId) return;

    // Update payment request and ledger entries to completed
    await this.prisma.ledgerEntryModel.updateMany({
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

    // Collect and store the payment method used in this checkout session
    try {
      await this.collectPaymentMethodFromCheckout(session, consumerId);
    } catch (error) {
      console.error(`Failed to collect payment method from checkout session:`, error);
      // Don't fail the entire webhook if payment method collection fails
    }
  }

  private async ensureStripeCustomer(consumerId: string) {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
    });

    if (!consumer) throw new BadRequestException(`Consumer not found`);

    if (consumer.stripeCustomerId) {
      return { consumer, customerId: consumer.stripeCustomerId };
    }

    const customer = await this.stripe.customers.create({
      email: consumer.email,
    });

    await this.prisma.consumerModel.update({
      where: { id: consumer.id },
      data: { stripeCustomerId: customer.id },
    });

    return { consumer, customerId: customer.id };
  }

  private async runPaymentMethodMigration() {
    try {
      // Migrate payment methods for a specific user
      const email = `alexey.golovin@lumiktech.com`;
      const consumer = await this.prisma.consumerModel.findFirst({
        where: { email },
        include: { paymentMethods: true },
      });

      if (!consumer) {
        console.log(`Consumer not found for migration`);
        return;
      }

      console.log(`Starting payment method migration for consumer:`, consumer.id);
      const { customerId } = await this.ensureStripeCustomer(consumer.id);
      console.log(`Customer ID:`, customerId);

      let attachedCount = 0;
      let failedCount = 0;

      for (const paymentMethod of consumer.paymentMethods) {
        if (!paymentMethod.stripePaymentMethodId) {
          console.log(`Skipping payment method without Stripe ID:`, paymentMethod.id);
          continue;
        }

        try {
          await this.stripe.paymentMethods.attach(paymentMethod.stripePaymentMethodId, {
            customer: customerId,
          });
          console.log(
            `✅ Payment method attached successfully:`,
            paymentMethod.id,
            paymentMethod.stripePaymentMethodId,
          );
          attachedCount++;
        } catch (error: any) {
          if (
            error.type === `invalid_request_error` &&
            (error.message.includes(`previously used without being attached`) ||
              error.message.includes(`was previously used without being attached`))
          ) {
            console.log(`❌ Payment method cannot be reused (used without customer):`, paymentMethod.id);
            // Mark this payment method as unusable - users will need to add new ones via setup intent
            await this.prisma.paymentMethodModel.update({
              where: { id: paymentMethod.id },
              data: {
                deletedAt: new Date(),
                stripePaymentMethodId: null, // Clear the unusable Stripe ID
              },
            });
            console.log(`🗑️ Marked payment method as deleted:`, paymentMethod.id);
          } else {
            console.log(`❌ Unexpected error attaching payment method:`, paymentMethod.id, error.message);
          }
          failedCount++;
        }
      }

      console.log(`Migration completed: ${attachedCount} attached, ${failedCount} failed`);
    } catch (error: any) {
      console.error(`Migration failed:`, error.message);
    }
  }

  // Manual migration method - can be called from an admin endpoint
  async migrateAllPaymentMethods() {
    console.log(`Starting comprehensive payment method migration for all consumers...`);

    try {
      const consumers = await this.prisma.consumerModel.findMany({
        include: { paymentMethods: true },
      });

      let totalAttached = 0;
      let totalFailed = 0;

      for (const consumer of consumers) {
        if (consumer.paymentMethods.length === 0) continue;

        console.log(`Migrating consumer: ${consumer.id} (${consumer.email})`);
        const { customerId } = await this.ensureStripeCustomer(consumer.id);

        for (const paymentMethod of consumer.paymentMethods) {
          if (!paymentMethod.stripePaymentMethodId || paymentMethod.deletedAt) {
            continue;
          }

          try {
            await this.stripe.paymentMethods.attach(paymentMethod.stripePaymentMethodId, {
              customer: customerId,
            });
            console.log(`✅ Attached: ${paymentMethod.id} for consumer ${consumer.id}`);
            totalAttached++;
          } catch (error: any) {
            if (
              error.type === `invalid_request_error` &&
              (error.message.includes(`previously used without being attached`) ||
                error.message.includes(`was previously used without being attached`))
            ) {
              await this.prisma.paymentMethodModel.update({
                where: { id: paymentMethod.id },
                data: {
                  deletedAt: new Date(),
                  stripePaymentMethodId: null,
                },
              });
              console.log(`🗑️ Marked unusable: ${paymentMethod.id} for consumer ${consumer.id}`);
            } else {
              console.log(`❌ Error: ${paymentMethod.id} for consumer ${consumer.id}: ${error.message}`);
            }
            totalFailed++;
          }
        }
      }

      console.log(`Migration completed: ${totalAttached} attached, ${totalFailed} failed/removed`);
      return { success: true, attached: totalAttached, failed: totalFailed };
    } catch (error: any) {
      console.error(`Migration failed:`, error.message);
      throw error;
    }
  }

  private async collectPaymentMethodFromCheckout(session: Stripe.Checkout.Session, consumerId: string) {
    // Get the payment intent to access the payment method
    if (!session.payment_intent) return;

    let paymentIntent: Stripe.PaymentIntent;
    if (typeof session.payment_intent === `string`) {
      paymentIntent = await this.stripe.paymentIntents.retrieve(session.payment_intent);
    } else {
      paymentIntent = session.payment_intent as Stripe.PaymentIntent;
    }

    if (!paymentIntent.payment_method) return;

    let paymentMethod: Stripe.PaymentMethod;
    if (typeof paymentIntent.payment_method === `string`) {
      paymentMethod = await this.stripe.paymentMethods.retrieve(paymentIntent.payment_method);
    } else {
      paymentMethod = paymentIntent.payment_method as Stripe.PaymentMethod;
    }

    // Ensure the payment method is attached to the Stripe customer
    const { customerId } = await this.ensureStripeCustomer(consumerId);

    try {
      // Attach the payment method to the customer (this allows reuse)
      await this.stripe.paymentMethods.attach(paymentMethod.id, {
        customer: customerId,
      });
      console.log(`Payment method attached to customer successfully`);
    } catch (error: any) {
      // Handle different types of attachment errors
      if (error.type === `invalid_request_error` && error.message.includes(`previously used without being attached`)) {
        console.log(`Payment method cannot be reused (used without customer), skipping storage`);
        return; // Don't store this payment method since it can't be reused
      } else if (error.type === `invalid_request_error` && error.message.includes(`already attached`)) {
        console.log(`Payment method already attached to customer, continuing...`);
      } else {
        console.log(`Payment method attachment warning:`, error.message);
      }
    }

    // Check if this payment method is already stored for the consumer
    const existingPaymentMethod = await this.prisma.paymentMethodModel.findFirst({
      where: {
        consumerId,
        stripePaymentMethodId: paymentMethod.id,
        deletedAt: null,
      },
    });

    if (existingPaymentMethod) {
      // Payment method already exists, no need to create duplicate
      return;
    }

    // Extract payment method details
    let billingDetails;
    if (paymentMethod.billing_details) {
      billingDetails = await this.prisma.billingDetailsModel.create({
        data: {
          email: paymentMethod.billing_details.email || null,
          name: paymentMethod.billing_details.name || null,
          phone: paymentMethod.billing_details.phone || null,
        },
      });
    }

    // Determine payment method type and extract card details
    let type: $Enums.PaymentMethodType;
    let brand: string | undefined;
    let last4: string | undefined;
    let expMonth: string | undefined;
    let expYear: string | undefined;

    if (paymentMethod.type === `card` && paymentMethod.card) {
      type = $Enums.PaymentMethodType.CREDIT_CARD;
      brand = paymentMethod.card.brand || `card`;
      last4 = paymentMethod.card.last4 || ``;
      expMonth = paymentMethod.card.exp_month ? String(paymentMethod.card.exp_month).padStart(2, `0`) : undefined;
      expYear = paymentMethod.card.exp_year ? String(paymentMethod.card.exp_year) : undefined;
    } else {
      // For other payment method types, we might not have detailed info
      // This could be expanded to handle other payment method types
      console.log(`Unsupported payment method type: ${paymentMethod.type}`);
      return;
    }

    // Check if consumer already has a default payment method
    const hasDefault = await this.prisma.paymentMethodModel.count({
      where: { consumerId, deletedAt: null, defaultSelected: true },
    });

    // Create the payment method record
    await this.prisma.paymentMethodModel.create({
      data: {
        type,
        stripePaymentMethodId: paymentMethod.id,
        stripeFingerprint: paymentMethod.card?.fingerprint || null,
        defaultSelected: hasDefault === 0, // Make this default if no other default exists
        brand: brand || `card`,
        last4: last4 || ``,
        expMonth,
        expYear,
        serviceFee: 0,
        billingDetailsId: billingDetails?.id || null,
        consumerId,
      },
    });
  }
}
