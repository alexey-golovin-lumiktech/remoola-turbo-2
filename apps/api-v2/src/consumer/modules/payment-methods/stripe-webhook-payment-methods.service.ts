import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { CONSUMER_STRIPE_WEBHOOK_CLIENT } from './stripe-webhook.tokens';
import { PrismaService } from '../../../shared/prisma.service';

import type Stripe from 'stripe';

@Injectable()
export class StripeWebhookPaymentMethodsService {
  private readonly logger = new Logger(StripeWebhookPaymentMethodsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONSUMER_STRIPE_WEBHOOK_CLIENT) private readonly stripe: Stripe,
  ) {}

  async ensureStripeCustomer(consumerId: string) {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
    });

    if (!consumer) throw new BadRequestException(errorCodes.CONSUMER_NOT_FOUND_WEBHOOK);

    if (consumer.stripeCustomerId) {
      return { consumer, customerId: consumer.stripeCustomerId };
    }

    const customer = await this.stripe.customers.create(
      {
        email: consumer.email,
      },
      { idempotencyKey: this.buildEnsureCustomerIdempotencyKey(consumer.id) },
    );

    const claimed = await this.prisma.consumerModel.updateMany({
      where: { id: consumer.id, stripeCustomerId: null },
      data: { stripeCustomerId: customer.id },
    });
    if (claimed.count === 0) {
      const existing = await this.prisma.consumerModel.findUnique({
        where: { id: consumer.id },
        select: { stripeCustomerId: true },
      });
      if (existing?.stripeCustomerId) {
        return { consumer, customerId: existing.stripeCustomerId };
      }
    }

    return { consumer, customerId: customer.id };
  }

  async migrateAllPaymentMethods(handlers?: {
    ensureStripeCustomer?: (consumerId: string) => Promise<{ customerId: string }>;
  }) {
    this.logger.log({ message: `Payment method migration started` });

    try {
      const consumers = await this.prisma.consumerModel.findMany({
        include: { paymentMethods: true },
      });

      let totalAttached = 0;
      let totalFailed = 0;
      const ensureStripeCustomer =
        handlers?.ensureStripeCustomer ?? ((consumerId) => this.ensureStripeCustomer(consumerId));

      for (const consumer of consumers) {
        if (consumer.paymentMethods.length === 0) continue;

        this.logger.debug({ message: `Migrating consumer payment methods` });
        const { customerId } = await ensureStripeCustomer(consumer.id);

        for (const paymentMethod of consumer.paymentMethods) {
          if (!paymentMethod.stripePaymentMethodId || paymentMethod.deletedAt) {
            continue;
          }

          try {
            await this.stripe.paymentMethods.attach(paymentMethod.stripePaymentMethodId, {
              customer: customerId,
            });
            this.logger.debug({ message: `Payment method attached`, paymentMethodId: paymentMethod.id });
            totalAttached++;
          } catch (error: unknown) {
            const err = error as { type?: string; message?: string };
            if (
              err?.type === `invalid_request_error` &&
              typeof err?.message === `string` &&
              (err.message.includes(`previously used without being attached`) ||
                err.message.includes(`was previously used without being attached`))
            ) {
              await this.prisma.paymentMethodModel.update({
                where: { id: paymentMethod.id },
                data: {
                  deletedAt: new Date(),
                  stripePaymentMethodId: null,
                },
              });
              this.logger.debug({ message: `Payment method marked unusable`, paymentMethodId: paymentMethod.id });
            } else {
              this.logger.warn({
                message: `Migration attach error`,
                paymentMethodId: paymentMethod.id,
              });
            }
            totalFailed++;
          }
        }
      }

      this.logger.log({
        message: `Migration completed`,
        attached: totalAttached,
        failed: totalFailed,
      });
      return { success: true, attached: totalAttached, failed: totalFailed };
    } catch (error: unknown) {
      this.logger.error({ message: `Migration failed` });
      throw error;
    }
  }

  async collectPaymentMethodFromCheckout(
    session: Stripe.Checkout.Session,
    consumerId: string,
    handlers?: {
      ensureStripeCustomer?: (consumerId: string) => Promise<{ customerId: string }>;
    },
  ) {
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

    const ensureStripeCustomer = handlers?.ensureStripeCustomer ?? ((id) => this.ensureStripeCustomer(id));
    const { customerId } = await ensureStripeCustomer(consumerId);

    let paymentMethodAttached = paymentMethod.customer === customerId;

    try {
      if (!paymentMethodAttached) {
        await this.stripe.paymentMethods.attach(paymentMethod.id, {
          customer: customerId,
        });
        paymentMethodAttached = true;
        this.logger.debug({ message: `Payment method attached to customer` });
      }
    } catch (error: unknown) {
      const err = error as { type?: string; message?: string } | null | undefined;
      if (err?.type === `invalid_request_error` && err?.message?.includes(`previously used without being attached`)) {
        this.logger.debug({ message: `Payment method cannot be reused (used without customer), skipping storage` });
        return;
      } else if (err?.type === `invalid_request_error` && err?.message?.includes(`already attached`)) {
        this.logger.debug({ message: `Payment method already attached to customer, continuing` });
      } else {
        this.logger.warn({ message: `Payment method attachment warning` });
      }
    }

    if (!paymentMethodAttached) {
      const refreshedPaymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethod.id);
      if (refreshedPaymentMethod.customer !== customerId) {
        this.logger.warn({
          message: `Skipping payment method storage because it is not attached to the expected customer`,
          paymentMethodId: paymentMethod.id,
        });
        return;
      }
      paymentMethod = refreshedPaymentMethod;
    }

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
      this.logger.debug({ message: `Unsupported payment method type for storage`, type: paymentMethod.type });
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtext((${consumerId} || ':' || ${paymentMethod.id})::text)::bigint)
      `);

      const existingPaymentMethod = await tx.paymentMethodModel.findFirst({
        where: {
          consumerId,
          stripePaymentMethodId: paymentMethod.id,
          deletedAt: null,
        },
      });

      if (existingPaymentMethod) {
        return;
      }

      let billingDetails;
      if (paymentMethod.billing_details) {
        billingDetails = await tx.billingDetailsModel.create({
          data: {
            email: paymentMethod.billing_details.email || null,
            name: paymentMethod.billing_details.name || null,
            phone: paymentMethod.billing_details.phone || null,
          },
        });
      }

      const hasDefault = await tx.paymentMethodModel.count({
        where: {
          consumerId,
          deletedAt: null,
          type,
          defaultSelected: true,
        },
      });

      await tx.paymentMethodModel.create({
        data: {
          type,
          stripePaymentMethodId: paymentMethod.id,
          stripeFingerprint: paymentMethod.card?.fingerprint || null,
          defaultSelected: hasDefault === 0,
          brand: brand || `card`,
          last4: last4 || ``,
          expMonth,
          expYear,
          serviceFee: 0,
          billingDetailsId: billingDetails?.id || null,
          consumerId,
        },
      });
    });
  }

  private buildEnsureCustomerIdempotencyKey(consumerId: string): string {
    return `ensure-customer:${consumerId}`;
  }
}
