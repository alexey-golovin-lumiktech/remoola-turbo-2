import { Inject, Injectable, Logger, type RawBodyRequest } from '@nestjs/common';
import express from 'express';
import Stripe from 'stripe';

import { type ConsumerAppScope } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';

import { STRIPE_EVENT } from './events';
import { StripeWebhookPaymentMethodsService } from './stripe-webhook-payment-methods.service';
import { StripeWebhookPayoutsService } from './stripe-webhook-payouts.service';
import { StripeWebhookReversalsService } from './stripe-webhook-reversals.service';
import { StripeWebhookSettlementsService } from './stripe-webhook-settlements.service';
import { StripeWebhookVerificationService } from './stripe-webhook-verification.service';
import { CONSUMER_STRIPE_WEBHOOK_CLIENT } from './stripe-webhook.tokens';
import { envs } from '../../../envs';
import { resolvePaymentLinkConsumerAppScopeFromLedgerHistory } from '../../../shared/payment-link-scope-resolver';
import { PrismaService } from '../../../shared/prisma.service';
import { STRIPE_IDENTITY_STATUS } from '../../../shared-common';

type VerificationConsumerDb = Pick<PrismaService, `consumerModel`>;
type VerificationSessionState = {
  stripeIdentityStatus: string | null;
  stripeIdentitySessionId: string | null;
  legalVerified?: boolean | null;
};

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONSUMER_STRIPE_WEBHOOK_CLIENT) private readonly stripe: Stripe,
    private readonly paymentMethodsService: StripeWebhookPaymentMethodsService,
    private readonly payoutsService: StripeWebhookPayoutsService,
    private readonly settlementsService: StripeWebhookSettlementsService,
    private readonly verificationService: StripeWebhookVerificationService,
    private readonly reversalsService: StripeWebhookReversalsService,
  ) {}

  private getEffectiveStatus(entry: {
    status: $Enums.TransactionStatus;
    outcomes?: Array<{ status: $Enums.TransactionStatus }>;
  }): $Enums.TransactionStatus {
    return entry.outcomes?.[0]?.status ?? entry.status;
  }

  private getRequesterReversalEntryType(params: {
    settlementEntryType: $Enums.LedgerEntryType | null | undefined;
    paymentRail?: $Enums.PaymentRail | null;
  }): $Enums.LedgerEntryType {
    return params.settlementEntryType === $Enums.LedgerEntryType.USER_DEPOSIT ||
      params.paymentRail === $Enums.PaymentRail.CARD
      ? $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL
      : $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL;
  }

  private async ensureCardPaymentRail(
    tx: Pick<Prisma.TransactionClient, `paymentRequestModel`>,
    paymentRequestId: string,
    updatedBy: string,
  ) {
    await tx.paymentRequestModel.updateMany({
      where: { id: paymentRequestId, paymentRail: null },
      data: {
        paymentRail: $Enums.PaymentRail.CARD,
        updatedBy,
      },
    });
  }

  private logWebhookFailure(params: {
    stage: `signature_verification_failed` | `managed_verification_processing_failed` | `webhook_processing_failed`;
    error: unknown;
    hasRawBody: boolean;
    hasSignatureHeader: boolean;
    eventId?: string;
    eventType?: string;
  }) {
    const { stage, error, hasRawBody, hasSignatureHeader, eventId, eventType } = params;
    const err = error instanceof Error ? error : null;
    const prismaCode = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined;

    this.logger.warn({
      event: `stripe_webhook_processing_failed`,
      stage,
      eventId,
      eventType,
      errorClass: err?.name ?? `UnknownError`,
      errorMessage: err?.message,
      prismaCode,
      hasRawBody,
      hasSignatureHeader,
    });
  }

  private buildVerificationSessionIdempotencyKey(consumerId: string, priorSessionId: string | null): string {
    return `verify-session:${consumerId}:${priorSessionId ?? `none`}`;
  }

  private buildVerificationSessionResponse(session: Stripe.Identity.VerificationSession) {
    return { clientSecret: session.client_secret, sessionId: session.id };
  }

  private async getVerificationSessionState(consumerId: string): Promise<VerificationSessionState | null> {
    return this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: {
        legalVerified: true,
        stripeIdentityStatus: true,
        stripeIdentitySessionId: true,
      },
    });
  }

  async startVerifyMeStripeSession(consumerId: string) {
    return this.verificationService.startVerifyMeStripeSession(consumerId);
  }

  async processStripeEvent(req: RawBodyRequest<express.Request>, res: express.Response) {
    if (!envs.STRIPE_WEBHOOK_SECRET || envs.STRIPE_WEBHOOK_SECRET === `STRIPE_WEBHOOK_SECRET`) {
      this.logger.debug(`Invalid STRIPE_WEBHOOK_SECRET value`);
      res.status(401).json({ received: false, error: `Webhook secret not configured` });
      return;
    }
    const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.isBuffer(req.body) ? req.body : undefined;
    if (!rawBody) {
      res.status(400).json({ received: false, error: `Missing raw body` });
      return;
    }

    const signatureRaw = req.headers[`stripe-signature`];
    const signature = Array.isArray(signatureRaw) ? signatureRaw[0] : signatureRaw;
    if (!signature || typeof signature !== `string`) {
      res.status(401).json({ received: false, error: `Missing webhook signature` });
      return;
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, envs.STRIPE_WEBHOOK_SECRET);
    } catch (error: unknown) {
      this.logWebhookFailure({
        stage: `signature_verification_failed`,
        error,
        hasRawBody: Boolean(rawBody),
        hasSignatureHeader: typeof signature === `string` && signature.length > 0,
      });
      res.status(400).json({ received: false, error: `Webhook processing failed` });
      return;
    }

    let failureStage: `managed_verification_processing_failed` | `webhook_processing_failed` =
      `webhook_processing_failed`;
    try {
      if (this.verificationService.isManagedVerificationEvent(event.type)) {
        try {
          await this.processManagedVerificationEvent(event);
        } catch (dedupErr) {
          if (dedupErr instanceof Prisma.PrismaClientKnownRequestError && dedupErr.code === `P2002`) {
            this.logger.debug({
              message: `Stripe webhook duplicate event, skipping`,
              eventId: event.id,
              eventType: event.type,
            });
            res.json({ received: true });
            return;
          }
          failureStage = `managed_verification_processing_failed`;
          throw dedupErr;
        }

        res.json({ received: true });
        return;
      }

      switch (event.type) {
        case STRIPE_EVENT.CHECKOUT_SESSION_COMPLETED: {
          this.logger.log({ message: `Webhook processing`, eventType: event.type });
          await this.finalizeCheckoutSessionSuccess(event.data.object);
          this.logger.log({ message: `Webhook processed`, eventType: event.type });
          break;
        }

        case STRIPE_EVENT.CHARGE_REFUNDED: {
          this.logger.log({
            message: `Idempotency-key audit`,
            eventType: event.type,
            idempotencyKey: event.request?.idempotency_key ?? null,
          });
          this.logger.log({ message: `Webhook processing`, eventType: event.type });
          await this.handleChargeRefunded(event.data.object as Stripe.Charge);
          this.logger.log({ message: `Webhook processed`, eventType: event.type });
          break;
        }

        case STRIPE_EVENT.CHARGE_REFUND_UPDATED: {
          this.logger.log({
            message: `Idempotency-key audit`,
            eventType: event.type,
            idempotencyKey: event.request?.idempotency_key ?? null,
          });
          await this.handleRefundUpdated(event.data.object as Stripe.Refund);
          break;
        }

        case STRIPE_EVENT.CHARGE_DISPUTE_CREATED:
        case STRIPE_EVENT.CHARGE_DISPUTE_UPDATED:
        case STRIPE_EVENT.CHARGE_DISPUTE_CLOSED: {
          this.logger.log({
            message: `Idempotency-key audit`,
            eventType: event.type,
            idempotencyKey: event.request?.idempotency_key ?? null,
          });
          this.logger.log({ message: `Webhook processing`, eventType: event.type });
          await this.handleChargeDispute(event.data.object as Stripe.Dispute);
          this.logger.log({ message: `Webhook processed`, eventType: event.type });
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
          this.logger.debug({ message: `Webhook skipped`, eventType: event.type });
          break;
        }
      }

      try {
        await this.recordWebhookEventProcessed(event.id);
      } catch (dedupErr) {
        if (dedupErr instanceof Prisma.PrismaClientKnownRequestError && dedupErr.code === `P2002`) {
          this.logger.debug({
            message: `Stripe webhook duplicate event, skipping`,
            eventId: event.id,
            eventType: event.type,
          });
        } else {
          throw dedupErr;
        }
      }

      res.json({ received: true });
      return;
    } catch (error: unknown) {
      this.logWebhookFailure({
        stage: failureStage,
        error,
        hasRawBody: Boolean(rawBody),
        hasSignatureHeader: typeof signature === `string` && signature.length > 0,
        eventId: event.id,
        eventType: event.type,
      });

      res.status(500).json({ received: false, error: `Webhook processing failed` });
      return;
    }
  }

  private async handlePayoutPaid(event: Stripe.Event) {
    const payout = event.data.object as Stripe.Payout;

    if (!payout.metadata?.transactionId) return;

    return this.payoutsService.handlePayoutPaid(payout.metadata.transactionId, payout.id);
  }

  private async handlePayoutFailed(event: Stripe.Event) {
    const payout = event.data.object as Stripe.Payout;

    if (!payout.metadata?.transactionId) return;

    return this.payoutsService.handlePayoutFailed(payout.metadata.transactionId, payout.id);
  }

  private async handleVerified(session: Stripe.Identity.VerificationSession, db: VerificationConsumerDb = this.prisma) {
    return this.verificationService.handleVerified(session, db);
  }

  private async handleRequiresInput(
    session: Stripe.Identity.VerificationSession,
    db: VerificationConsumerDb = this.prisma,
  ) {
    return this.verificationService.handleRequiresInput(session, db);
  }

  private async handleLifecycleUpdate(
    session: Stripe.Identity.VerificationSession,
    eventType: string,
    db: VerificationConsumerDb = this.prisma,
  ) {
    return this.verificationService.handleLifecycleUpdate(session, eventType, db);
  }

  private async getReusableVerificationSession(consumerId: string, consumer?: VerificationSessionState | null) {
    const state = consumer ?? (await this.getVerificationSessionState(consumerId));

    if (!state?.stripeIdentitySessionId || !this.canReuseVerificationSession(state.stripeIdentityStatus)) {
      return null;
    }

    try {
      const session = await this.stripe.identity.verificationSessions.retrieve(state.stripeIdentitySessionId);
      if (typeof session.client_secret === `string` && session.client_secret.length > 0) {
        return this.buildVerificationSessionResponse(session);
      }
    } catch (error: unknown) {
      this.logger.warn({
        message: `Failed to reuse verification session`,
        consumerId,
        sessionId: state.stripeIdentitySessionId,
        errorClass: error instanceof Error ? error.name : `UnknownError`,
      });
    }

    return null;
  }

  private canReuseVerificationSession(status?: string | null) {
    return status === STRIPE_IDENTITY_STATUS.PENDING_SUBMISSION || status === STRIPE_IDENTITY_STATUS.REQUIRES_INPUT;
  }

  private async recordWebhookEventProcessed(eventId: string) {
    await this.prisma.stripeWebhookEventModel.create({
      data: { eventId },
    });
  }

  private isManagedVerificationEvent(eventType: string) {
    return (
      eventType === STRIPE_EVENT.IDENTITY_VERIFICATION_SESSION_VERIFIED ||
      eventType === STRIPE_EVENT.IDENTITY_VERIFICATION_SESSION_REQUIRES_INPUT ||
      eventType === STRIPE_EVENT.IDENTITY_VERIFICATION_SESSION_CANCELED ||
      eventType === STRIPE_EVENT.IDENTITY_VERIFICATION_SESSION_REDACTED
    );
  }

  private async processManagedVerificationEvent(event: Stripe.Event) {
    return this.verificationService.processManagedVerificationEvent(event, {
      handleVerified: (session, db) => this.handleVerified(session, db),
      handleRequiresInput: (session, db) => this.handleRequiresInput(session, db),
      handleLifecycleUpdate: (session, eventType, db) => this.handleLifecycleUpdate(session, eventType, db),
    });
  }

  private async findConsumerForVerificationSession(db: VerificationConsumerDb, consumerId: string, sessionId: string) {
    const consumer = await db.consumerModel.findFirst({
      where: {
        id: consumerId,
        OR: [{ stripeIdentitySessionId: sessionId }, { stripeIdentitySessionId: null }],
      },
      include: { personalDetails: true },
    });
    if (consumer) {
      return consumer;
    }

    await this.logUnexpectedVerificationSessionState(consumerId, sessionId, db);
    return null;
  }

  private async logUnexpectedVerificationSessionState(
    consumerId: string,
    sessionId: string,
    db: VerificationConsumerDb = this.prisma,
  ) {
    const consumer = await db.consumerModel.findUnique({
      where: { id: consumerId },
      select: { id: true, stripeIdentitySessionId: true },
    });
    if (!consumer) {
      this.logger.warn({ message: `Consumer not found for verification session` });
      return;
    }

    this.logger.warn({
      message: `Ignoring stale verification session update`,
      consumerId,
      incomingSessionId: sessionId,
      currentSessionId: consumer.stripeIdentitySessionId,
    });
  }

  async finalizeCheckoutSessionSuccess(session: Stripe.Checkout.Session) {
    return this.settlementsService.finalizeCheckoutSessionSuccess(session, {
      collectPaymentMethodFromCheckout: (checkoutSession, consumerId) =>
        this.collectPaymentMethodFromCheckout(checkoutSession, consumerId),
    });
  }

  private async ensureStripeCustomer(consumerId: string) {
    return this.paymentMethodsService.ensureStripeCustomer(consumerId);
  }

  async migrateAllPaymentMethods() {
    return this.paymentMethodsService.migrateAllPaymentMethods({
      ensureStripeCustomer: (consumerId) => this.ensureStripeCustomer(consumerId),
    });
  }

  private async collectPaymentMethodFromCheckout(session: Stripe.Checkout.Session, consumerId: string) {
    return this.paymentMethodsService.collectPaymentMethodFromCheckout(session, consumerId, {
      ensureStripeCustomer: (id) => this.ensureStripeCustomer(id),
    });
  }

  private async resolvePaymentRequestByPaymentIntent(paymentIntentId: string) {
    const byOutcome = await this.prisma.ledgerEntryOutcomeModel.findFirst({
      where: { externalId: paymentIntentId },
      orderBy: { createdAt: `desc` },
      select: {
        ledgerEntry: {
          select: {
            paymentRequestId: true,
            paymentRequest: {
              select: {
                id: true,
                amount: true,
                currencyCode: true,
                payerId: true,
                requesterId: true,
                requesterEmail: true,
              },
            },
          },
        },
      },
    });
    if (byOutcome?.ledgerEntry?.paymentRequest) return byOutcome.ledgerEntry.paymentRequest;

    const entry = await this.prisma.ledgerEntryModel.findFirst({
      where: {
        stripeId: paymentIntentId,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
      },
      select: {
        paymentRequestId: true,
        paymentRequest: {
          select: {
            id: true,
            amount: true,
            currencyCode: true,
            payerId: true,
            requesterId: true,
            requesterEmail: true,
          },
        },
      },
      orderBy: { createdAt: `desc` },
    });

    if (!entry?.paymentRequest) return null;

    return entry.paymentRequest;
  }

  private async createStripeReversal(params: {
    paymentRequestId: string;
    payerId: string | null;
    requesterId: string | null;
    requesterEmail?: string | null;
    currencyCode: $Enums.CurrencyCode;
    requestAmount: number;
    amount: number;
    kind: `REFUND` | `CHARGEBACK`;
    stripeObjectId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    return this.reversalsService.createStripeReversal(params, {
      sendReversalEmails: (sendParams) => this.sendReversalEmails(sendParams),
    });
  }

  private async sendReversalEmails(params: {
    paymentRequestId: string;
    payerId: string;
    requesterId: string | null;
    requesterEmail?: string;
    amount: number;
    currencyCode: $Enums.CurrencyCode;
    kind: `REFUND` | `CHARGEBACK`;
    reason?: string | null;
  }) {
    return this.reversalsService.sendReversalEmails(params);
  }

  private async resolvePaymentLinkConsumerAppScope(paymentRequestId: string): Promise<ConsumerAppScope | undefined> {
    return resolvePaymentLinkConsumerAppScopeFromLedgerHistory(this.prisma, paymentRequestId);
  }

  private async handleChargeRefunded(charge: Stripe.Charge) {
    return this.reversalsService.handleChargeRefunded(charge);
  }

  private async handleRefundUpdated(refund: Stripe.Refund) {
    return this.reversalsService.handleRefundUpdated(refund);
  }

  private async handleChargeDispute(dispute: Stripe.Dispute) {
    return this.reversalsService.handleChargeDispute(dispute);
  }

  private async recordDisputeStatus(params: { paymentIntentId: string; dispute: Stripe.Dispute }) {
    return this.reversalsService.recordDisputeStatus(params);
  }
}
