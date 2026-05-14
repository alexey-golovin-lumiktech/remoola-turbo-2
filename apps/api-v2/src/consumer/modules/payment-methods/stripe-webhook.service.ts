import { Inject, Injectable, Logger, type RawBodyRequest } from '@nestjs/common';
import express from 'express';
import Stripe from 'stripe';

import { $Enums, Prisma } from '@remoola/database-2';

import { StripeWebhookEventProcessorService } from './stripe-webhook-event-processor.service';
import { StripeWebhookPaymentMethodsService } from './stripe-webhook-payment-methods.service';
import { StripeWebhookReversalsService } from './stripe-webhook-reversals.service';
import { StripeWebhookRouterService } from './stripe-webhook-router.service';
import { StripeWebhookSettlementsService } from './stripe-webhook-settlements.service';
import { type VerificationConsumerDb } from './stripe-webhook-verification.repository';
import { StripeWebhookVerificationService } from './stripe-webhook-verification.service';
import { CONSUMER_STRIPE_WEBHOOK_CLIENT } from './stripe-webhook.tokens';
import { envs } from '../../../envs';
import { PrismaService } from '../../../shared/prisma.service';

type StripeWebhookResult = {
  statusCode: number;
  body: {
    received: boolean;
    error?: string;
  };
};

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONSUMER_STRIPE_WEBHOOK_CLIENT) private readonly stripe: Stripe,
    private readonly paymentMethodsService: StripeWebhookPaymentMethodsService,
    private readonly settlementsService: StripeWebhookSettlementsService,
    private readonly verificationService: StripeWebhookVerificationService,
    private readonly reversalsService: StripeWebhookReversalsService,
    private readonly router: StripeWebhookRouterService,
    private readonly eventProcessor: StripeWebhookEventProcessorService,
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

  async startVerifyMeStripeSession(consumerId: string) {
    return this.verificationService.startVerifyMeStripeSession(consumerId);
  }

  async processStripeEventResult(req: RawBodyRequest<express.Request>): Promise<StripeWebhookResult> {
    if (!envs.STRIPE_WEBHOOK_SECRET || envs.STRIPE_WEBHOOK_SECRET === `STRIPE_WEBHOOK_SECRET`) {
      this.logger.debug(`Invalid STRIPE_WEBHOOK_SECRET value`);
      return { statusCode: 401, body: { received: false, error: `Webhook secret not configured` } };
    }
    const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.isBuffer(req.body) ? req.body : undefined;
    if (!rawBody) {
      return { statusCode: 400, body: { received: false, error: `Missing raw body` } };
    }

    const signatureRaw = req.headers[`stripe-signature`];
    const signature = Array.isArray(signatureRaw) ? signatureRaw[0] : signatureRaw;
    if (!signature || typeof signature !== `string`) {
      return { statusCode: 401, body: { received: false, error: `Missing webhook signature` } };
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
      return { statusCode: 400, body: { received: false, error: `Webhook processing failed` } };
    }

    let failureStage: `managed_verification_processing_failed` | `webhook_processing_failed` =
      `webhook_processing_failed`;
    try {
      if (this.router.isManagedVerificationEvent(event.type)) {
        try {
          await this.router.routeManagedVerificationEvent(event);
        } catch (dedupErr) {
          if (dedupErr instanceof Prisma.PrismaClientKnownRequestError && dedupErr.code === `P2002`) {
            this.logger.debug({
              message: `Stripe webhook duplicate event, skipping`,
              eventId: event.id,
              eventType: event.type,
            });
            return { statusCode: 200, body: { received: true } };
          }
          failureStage = `managed_verification_processing_failed`;
          throw dedupErr;
        }

        return { statusCode: 200, body: { received: true } };
      }

      const processResult = await this.eventProcessor.process(event, () =>
        this.router.routeEvent(event).then(() => undefined),
      );
      if (processResult === `inFlight`) {
        return { statusCode: 503, body: { received: false, error: `Webhook event already processing` } };
      }

      return { statusCode: 200, body: { received: true } };
    } catch (error: unknown) {
      this.logWebhookFailure({
        stage: failureStage,
        error,
        hasRawBody: Boolean(rawBody),
        hasSignatureHeader: typeof signature === `string` && signature.length > 0,
        eventId: event.id,
        eventType: event.type,
      });

      return { statusCode: 500, body: { received: false, error: `Webhook processing failed` } };
    }
  }

  async processStripeEvent(req: RawBodyRequest<express.Request>, res: express.Response): Promise<void> {
    const result = await this.processStripeEventResult(req);
    res.status(result.statusCode).json(result.body);
  }

  private async handleVerified(session: Stripe.Identity.VerificationSession, db?: VerificationConsumerDb) {
    return this.verificationService.handleVerified(session, db);
  }

  private async handleRequiresInput(session: Stripe.Identity.VerificationSession, db?: VerificationConsumerDb) {
    return this.verificationService.handleRequiresInput(session, db);
  }

  private async handleLifecycleUpdate(
    session: Stripe.Identity.VerificationSession,
    eventType: string,
    db?: VerificationConsumerDb,
  ) {
    return this.verificationService.handleLifecycleUpdate(session, eventType, db);
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
    return this.reversalsService.createStripeReversal(params);
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
