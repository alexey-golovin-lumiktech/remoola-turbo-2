import { Injectable, Logger } from '@nestjs/common';

import { StripeWebhookSettlementsRepository } from './stripe-webhook-settlements.repository';

import type Stripe from 'stripe';

@Injectable()
export class StripeWebhookSettlementsService {
  private readonly logger = new Logger(StripeWebhookSettlementsService.name);

  constructor(private readonly settlementsRepository: StripeWebhookSettlementsRepository) {}

  async finalizeCheckoutSessionSuccess(
    session: Stripe.Checkout.Session,
    handlers?: {
      collectPaymentMethodFromCheckout?: (
        session: Stripe.Checkout.Session,
        consumerId: string,
      ) => Promise<unknown> | unknown;
    },
  ) {
    const paymentRequestId = session.metadata?.paymentRequestId;
    const consumerId = session.metadata?.consumerId;

    if (!paymentRequestId || !consumerId) return;

    const paymentIntentId = this.getPaymentIntentId(session);
    const customerId = this.getCustomerId(session);

    const settlementReady = await this.settlementsRepository.finalizeCheckoutSettlement({
      checkoutSessionId: session.id,
      paymentRequestId,
      consumerId,
      paymentIntentId,
      paymentStatus: session.payment_status ?? null,
      amountTotal: session.amount_total ?? null,
      currency: session.currency ?? null,
      customerId,
      logger: this.logger,
    });

    if (!settlementReady) return;

    const collectPaymentMethodFromCheckout =
      handlers?.collectPaymentMethodFromCheckout ?? (() => Promise.resolve(undefined));

    try {
      await collectPaymentMethodFromCheckout(session, consumerId);
    } catch {
      this.logger.warn({ message: `Failed to collect payment method from checkout session` });
    }
  }

  private getPaymentIntentId(session: Stripe.Checkout.Session): string | null {
    if (!session.payment_intent) return null;
    return typeof session.payment_intent === `string` ? session.payment_intent : (session.payment_intent.id ?? null);
  }

  private getCustomerId(session: Stripe.Checkout.Session): string | null {
    if (!session.customer) return null;
    return typeof session.customer === `string` ? session.customer : (session.customer.id ?? null);
  }
}
