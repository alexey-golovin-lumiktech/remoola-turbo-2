import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';

import { $Enums } from '@remoola/database-2';

import { ConfirmStripeSetupIntent } from './dto/payment-method.dto';
import { envs } from '../../../envs';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class ConsumerStripeService {
  private stripe: Stripe;

  constructor(private prisma: PrismaService) {
    this.stripe = new Stripe(envs.STRIPE_SECRET_KEY, { apiVersion: `2025-11-17.clover` });
  }

  async createStripeSession(consumerId: string, paymentRequestId: string, frontendBaseUrl: string) {
    try {
      const pr = await this.prisma.paymentRequestModel.findFirst({
        where: {
          id: paymentRequestId,
          payerId: consumerId,
        },
        include: {
          ledgerEntries: true,
          requester: true,
        },
      });

      if (!pr) throw new NotFoundException(`Payment not found`);
      if (pr.status !== `PENDING`) throw new ForbiddenException(`Payment already processed`);

      const amountCents = Math.round(Number(pr.amount) * 100);

      // 1) Create Stripe Checkout session
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: [`card`],
        mode: `payment`,
        line_items: [
          {
            price_data: {
              currency: pr.currencyCode.toLowerCase(),
              product_data: {
                name: `Payment to ${pr.requester.email}`,
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        success_url: `${frontendBaseUrl}/payments/${pr.id}?success=1`,
        cancel_url: `${frontendBaseUrl}/payments/${pr.id}?canceled=1`,
        metadata: { paymentRequestId: pr.id, consumerId },
      });

      // 2) Update transaction to Waiting status
      await this.prisma.ledgerEntryModel.updateMany({
        where: { paymentRequestId: pr.id },
        data: { status: `WAITING`, stripeId: session.id },
      });

      return { url: session.url };
    } catch (error) {
      console.log(`error`, error);
      console.log(`frontendBaseUrl`, frontendBaseUrl);
      throw error;
    }
  }

  async getPaymentMethodMetadata(paymentMethodId: string) {
    const pm = await this.stripe.paymentMethods.retrieve(paymentMethodId);

    return {
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      expMonth: pm.card?.exp_month?.toString(),
      expYear: pm.card?.exp_year?.toString(),
    };
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

  // 1) Create SetupIntent for new card
  async createStripeSetupIntent(consumerId: string) {
    const { customerId } = await this.ensureStripeCustomer(consumerId);

    const intent = await this.stripe.setupIntents.create({
      customer: customerId,
      usage: `off_session`,
      payment_method_types: [`card`],
    });

    if (!intent.client_secret) {
      throw new BadRequestException(`No client_secret from Stripe`);
    }

    return { clientSecret: intent.client_secret };
  }

  // 2) Confirm SetupIntent -> persist card in DB
  async confirmStripeSetupIntent(consumerId: string, body: ConfirmStripeSetupIntent) {
    const { consumer } = await this.ensureStripeCustomer(consumerId);

    const setupIntent = await this.stripe.setupIntents.retrieve(body.setupIntentId, { expand: [`payment_method`] });

    if (setupIntent.status !== `succeeded`) {
      throw new BadRequestException(`SetupIntent not succeeded. Current status: ${setupIntent.status}`);
    }

    const pm = setupIntent.payment_method;
    if (!pm || typeof pm === `string`) {
      throw new BadRequestException(`No payment_method on SetupIntent`);
    }

    if (pm.type !== `card` || !pm.card) {
      throw new BadRequestException(`Only card payment methods supported`);
    }

    const card = pm.card;
    const billing = pm.billing_details ?? {};

    const billingDetails = await this.prisma.billingDetailsModel.create({
      data: {
        email: billing[`email`] ?? consumer.email,
        name: (billing[`name`] as string | null) ?? null,
        phone: (billing[`phone`] as string | null) ?? null,
      },
    });

    const hasDefault = await this.prisma.paymentMethodModel.count({
      where: { consumerId, deletedAt: null, defaultSelected: true },
    });

    const created = await this.prisma.paymentMethodModel.create({
      data: {
        type: $Enums.PaymentMethodType.CREDIT_CARD,
        defaultSelected: hasDefault === 0,
        brand: card.brand ?? `card`,
        last4: card.last4 ?? ``,
        serviceFee: 0,
        expMonth: card.exp_month ? String(card.exp_month).padStart(2, `0`) : null,
        expYear: card.exp_year ? String(card.exp_year) : null,
        billingDetailsId: billingDetails.id,
        consumerId,
      },
    });

    return created;
  }
}
