import { Injectable, Logger } from '@nestjs/common';

import { STRIPE_EVENT } from './events';
import { StripeWebhookPaymentMethodsService } from './stripe-webhook-payment-methods.service';
import { StripeWebhookPayoutsService } from './stripe-webhook-payouts.service';
import { StripeWebhookReversalsService } from './stripe-webhook-reversals.service';
import { StripeWebhookSettlementsService } from './stripe-webhook-settlements.service';
import { StripeWebhookVerificationService } from './stripe-webhook-verification.service';

import type Stripe from 'stripe';

type StripeWebhookEventHandler = (event: Stripe.Event) => Promise<void>;
type StripeWebhookRouteResult = `handled` | `ignored`;

@Injectable()
export class StripeWebhookRouterService {
  private readonly logger = new Logger(StripeWebhookRouterService.name);
  private readonly eventHandlers: Record<string, StripeWebhookEventHandler>;

  constructor(
    private readonly paymentMethodsService: StripeWebhookPaymentMethodsService,
    private readonly payoutsService: StripeWebhookPayoutsService,
    private readonly settlementsService: StripeWebhookSettlementsService,
    private readonly verificationService: StripeWebhookVerificationService,
    private readonly reversalsService: StripeWebhookReversalsService,
  ) {
    this.eventHandlers = {
      [STRIPE_EVENT.CHECKOUT_SESSION_COMPLETED]: (event) =>
        this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session),
      [STRIPE_EVENT.CHARGE_REFUNDED]: (event) => this.handleChargeRefunded(event),
      [STRIPE_EVENT.CHARGE_REFUND_UPDATED]: (event) => this.handleRefundUpdated(event),
      [STRIPE_EVENT.CHARGE_DISPUTE_CREATED]: (event) => this.handleChargeDispute(event),
      [STRIPE_EVENT.CHARGE_DISPUTE_UPDATED]: (event) => this.handleChargeDispute(event),
      [STRIPE_EVENT.CHARGE_DISPUTE_CLOSED]: (event) => this.handleChargeDispute(event),
      'payout.paid': (event) => this.handlePayoutPaid(event),
      'payout.failed': (event) => this.handlePayoutFailed(event),
      'payout.canceled': (event) => this.handlePayoutFailed(event),
    };
  }

  isManagedVerificationEvent(eventType: string) {
    return this.verificationService.isManagedVerificationEvent(eventType);
  }

  async routeManagedVerificationEvent(event: Stripe.Event) {
    return this.verificationService.processManagedVerificationEvent(event);
  }

  async routeEvent(event: Stripe.Event): Promise<StripeWebhookRouteResult> {
    const handler = this.eventHandlers[event.type];
    if (!handler) {
      this.logger.debug({ message: `Webhook skipped`, eventType: event.type });
      return `ignored`;
    }

    await handler(event);
    return `handled`;
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    this.logger.log({ message: `Webhook processing`, eventType: STRIPE_EVENT.CHECKOUT_SESSION_COMPLETED });
    await this.settlementsService.finalizeCheckoutSessionSuccess(session, {
      collectPaymentMethodFromCheckout: (checkoutSession, consumerId) =>
        this.paymentMethodsService.collectPaymentMethodFromCheckout(checkoutSession, consumerId),
    });
    this.logger.log({ message: `Webhook processed`, eventType: STRIPE_EVENT.CHECKOUT_SESSION_COMPLETED });
  }

  private async handleChargeRefunded(event: Stripe.Event) {
    this.logIdempotencyKeyAudit(event);
    this.logger.log({ message: `Webhook processing`, eventType: event.type });
    await this.reversalsService.handleChargeRefunded(event.data.object as Stripe.Charge);
    this.logger.log({ message: `Webhook processed`, eventType: event.type });
  }

  private async handleRefundUpdated(event: Stripe.Event) {
    this.logIdempotencyKeyAudit(event);
    await this.reversalsService.handleRefundUpdated(event.data.object as Stripe.Refund);
  }

  private async handleChargeDispute(event: Stripe.Event) {
    this.logIdempotencyKeyAudit(event);
    this.logger.log({ message: `Webhook processing`, eventType: event.type });
    await this.reversalsService.handleChargeDispute(event.data.object as Stripe.Dispute);
    this.logger.log({ message: `Webhook processed`, eventType: event.type });
  }

  private async handlePayoutPaid(event: Stripe.Event) {
    const payout = event.data.object as Stripe.Payout;

    if (!payout.metadata?.transactionId) return;

    await this.payoutsService.handlePayoutPaid(payout.metadata.transactionId, payout.id);
  }

  private async handlePayoutFailed(event: Stripe.Event) {
    const payout = event.data.object as Stripe.Payout;

    if (!payout.metadata?.transactionId) return;

    await this.payoutsService.handlePayoutFailed(payout.metadata.transactionId, payout.id);
  }

  private logIdempotencyKeyAudit(event: Stripe.Event) {
    this.logger.log({
      message: `Idempotency-key audit`,
      eventType: event.type,
      idempotencyKey: event.request?.idempotency_key ?? null,
    });
  }
}
