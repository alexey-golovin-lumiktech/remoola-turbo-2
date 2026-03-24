import { randomUUID } from 'crypto';

import {
  BadRequestException,
  Injectable,
  Logger,
  type RawBodyRequest,
  ServiceUnavailableException,
} from '@nestjs/common';
import express from 'express';
import Stripe from 'stripe';

import { $Enums, Prisma } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { STRIPE_EVENT } from './events';
import { createOutcomeIdempotent } from './ledger-outcome-idempotent';
import { envs } from '../../../envs';
import { BalanceCalculationService } from '../../../shared/balance-calculation.service';
import { MailingService } from '../../../shared/mailing.service';
import { PrismaService } from '../../../shared/prisma.service';
import { getCurrencyFractionDigits, STRIPE_IDENTITY_STATUS } from '../../../shared-common';
import { ConsumerPaymentsService } from '../payments/consumer-payments.service';

type VerificationConsumerDb = Pick<PrismaService, `consumerModel`>;
type VerificationEventTx = Pick<Prisma.TransactionClient, `consumerModel` | `stripeWebhookEventModel`>;
type VerificationSessionState = {
  stripeIdentityStatus: string | null;
  stripeIdentitySessionId: string | null;
  legalVerified?: boolean | null;
};

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private readonly mailingService: MailingService,
    private readonly balanceService: BalanceCalculationService,
    private readonly consumerPaymentsService: ConsumerPaymentsService,
  ) {
    this.stripe = new Stripe(envs.STRIPE_SECRET_KEY, { apiVersion: `2025-11-17.clover` });
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

  private buildEnsureCustomerIdempotencyKey(consumerId: string): string {
    return `ensure-customer:${consumerId}`;
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
    await this.consumerPaymentsService.assertProfileCompleteForVerification(consumerId);
    const verificationState = await this.getVerificationSessionState(consumerId);
    const reusableSession = await this.getReusableVerificationSession(consumerId, verificationState);
    if (reusableSession) {
      return reusableSession;
    }

    const session = await this.stripe.identity.verificationSessions.create(
      {
        type: `document`,
        metadata: { consumerId }, // important
        options: {
          document: {
            allowed_types: [`passport`, `driving_license`, `id_card`],
            require_id_number: true,
            require_live_capture: true,
          },
        },
      },
      {
        idempotencyKey: this.buildVerificationSessionIdempotencyKey(
          consumerId,
          verificationState?.stripeIdentitySessionId ?? null,
        ),
      },
    );

    const now = new Date();
    const claimed = await this.prisma.consumerModel.updateMany({
      where: { id: consumerId, stripeIdentitySessionId: verificationState?.stripeIdentitySessionId ?? null },
      data: {
        stripeIdentityStatus: STRIPE_IDENTITY_STATUS.PENDING_SUBMISSION,
        stripeIdentitySessionId: session.id,
        stripeIdentityLastErrorCode: null,
        stripeIdentityLastErrorReason: null,
        stripeIdentityStartedAt: now,
        stripeIdentityUpdatedAt: now,
        stripeIdentityVerifiedAt: null,
      },
    });
    if (claimed.count === 0) {
      const concurrentSession = await this.getReusableVerificationSession(consumerId);
      if (concurrentSession) {
        return concurrentSession;
      }

      const latestState = await this.getVerificationSessionState(consumerId);
      if (latestState?.stripeIdentitySessionId === session.id) {
        return this.buildVerificationSessionResponse(session);
      }
    }

    return this.buildVerificationSessionResponse(session);
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

    console.log(`envs.STRIPE_SECRET_KEY`, envs.STRIPE_SECRET_KEY);
    console.log(`envs.STRIPE_WEBHOOK_SECRET`, envs.STRIPE_WEBHOOK_SECRET);
    console.log(`signature`, signature);
    console.log(`req.rawBody`, req.rawBody);
    console.log(`req.body`, req.body);
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
      if (this.isManagedVerificationEvent(event.type)) {
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

      // Dedupe marker by Stripe event id. On P2002 (duplicate), return 200 and skip processing
      // per GATE-007: Stripe replay → 200 + no-op.
      try {
        await this.prisma.stripeWebhookEventModel.create({
          data: { eventId: event.id },
        });
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
        throw dedupErr;
      }

      switch (event.type) {
        case STRIPE_EVENT.CHECKOUT_SESSION_COMPLETED: {
          this.logger.log({ message: `Webhook processing`, eventType: event.type });
          await this.handleStripeSuccess(event.data.object);
          this.logger.log({ message: `Webhook processed`, eventType: event.type });
          break;
        }

        case STRIPE_EVENT.CHARGE_REFUNDED: {
          this.logger.log({ message: `Webhook processing`, eventType: event.type });
          await this.handleChargeRefunded(event.data.object as Stripe.Charge);
          this.logger.log({ message: `Webhook processed`, eventType: event.type });
          break;
        }

        case STRIPE_EVENT.CHARGE_REFUND_UPDATED: {
          await this.handleRefundUpdated(event.data.object as Stripe.Refund);
          break;
        }

        case STRIPE_EVENT.CHARGE_DISPUTE_CREATED:
        case STRIPE_EVENT.CHARGE_DISPUTE_UPDATED:
        case STRIPE_EVENT.CHARGE_DISPUTE_CLOSED: {
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

      res.status(400).json({ received: false, error: `Webhook processing failed` });
      return;
    }
  }

  private async handlePayoutPaid(event: Stripe.Event) {
    const payout = event.data.object as Stripe.Payout;

    if (!payout.metadata?.transactionId) return;

    // Append-only: record outcome in tx for parity with DENIED path.
    await this.prisma.$transaction(async (tx) => {
      await createOutcomeIdempotent(
        tx,
        {
          ledgerEntryId: payout.metadata!.transactionId,
          status: $Enums.TransactionStatus.COMPLETED,
          source: `stripe`,
          externalId: payout.id,
        },
        this.logger,
      );
    });
  }

  private async handlePayoutFailed(event: Stripe.Event) {
    const payout = event.data.object as Stripe.Payout;

    if (!payout.metadata?.transactionId) return;

    // Append-only: record outcome in tx for parity with stripe.service DENIED path
    await this.prisma.$transaction(async (tx) => {
      await createOutcomeIdempotent(
        tx,
        {
          ledgerEntryId: payout.metadata!.transactionId,
          status: $Enums.TransactionStatus.DENIED,
          source: `stripe`,
          externalId: payout.id,
        },
        this.logger,
      );
    });
  }

  private async handleVerified(session: Stripe.Identity.VerificationSession, db: VerificationConsumerDb = this.prisma) {
    const consumerId = session.metadata?.consumerId;
    if (!consumerId) {
      this.logger.warn({ message: `Verification session missing consumerId in metadata` });
      return;
    }

    const consumer = await this.findConsumerForVerificationSession(db, consumerId, session.id);
    if (!consumer) {
      return;
    }

    let personalDetails;
    if (session.verified_outputs) {
      const doc = session.verified_outputs;

      const data = {
        firstName: doc.first_name ?? consumer.personalDetails?.firstName ?? null,
        lastName: doc.last_name ?? consumer.personalDetails?.lastName ?? null,
        dateOfBirth: doc.dob
          ? new Date(doc.dob.year, doc.dob.month - 1, doc.dob.day)
          : (consumer.personalDetails?.dateOfBirth ?? null),
        citizenOf: doc.address?.country ?? consumer.personalDetails?.citizenOf ?? null,
        passportOrIdNumber: consumer.personalDetails?.passportOrIdNumber ?? null,
      };

      personalDetails = { upsert: { create: data, update: data } };
    }

    return await db.consumerModel.update({
      where: { id: consumer.id },
      data: {
        legalVerified: true,
        stripeIdentityStatus: STRIPE_IDENTITY_STATUS.VERIFIED,
        stripeIdentitySessionId: session.id,
        stripeIdentityLastErrorCode: null,
        stripeIdentityLastErrorReason: null,
        stripeIdentityUpdatedAt: new Date(),
        stripeIdentityVerifiedAt: new Date(),
        ...(personalDetails && { personalDetails }),
      },
      include: { personalDetails: !!personalDetails },
    });
  }

  private async handleRequiresInput(
    session: Stripe.Identity.VerificationSession,
    db: VerificationConsumerDb = this.prisma,
  ) {
    const consumerId = session.metadata?.consumerId;
    if (!consumerId) {
      this.logger.warn({ message: `Verification session missing consumerId in metadata` });
      return;
    }

    const current = await db.consumerModel.findUnique({
      where: { id: consumerId },
      select: {
        legalVerified: true,
        stripeIdentityStatus: true,
        stripeIdentitySessionId: true,
      },
    });
    if (
      current?.stripeIdentitySessionId === session.id &&
      current.legalVerified &&
      current.stripeIdentityStatus === STRIPE_IDENTITY_STATUS.VERIFIED
    ) {
      this.logger.warn({
        message: `Ignoring verification session regression`,
        consumerId,
        sessionId: session.id,
        incomingStatus: STRIPE_IDENTITY_STATUS.REQUIRES_INPUT,
        currentStatus: current.stripeIdentityStatus,
      });
      return;
    }

    const result = await db.consumerModel.updateMany({
      where: {
        id: consumerId,
        OR: [{ stripeIdentitySessionId: session.id }, { stripeIdentitySessionId: null }],
      },
      data: {
        legalVerified: false,
        stripeIdentityStatus: STRIPE_IDENTITY_STATUS.REQUIRES_INPUT,
        stripeIdentitySessionId: session.id,
        stripeIdentityLastErrorCode: session.last_error?.code ?? null,
        stripeIdentityLastErrorReason: session.last_error?.reason ?? null,
        stripeIdentityUpdatedAt: new Date(),
        stripeIdentityVerifiedAt: null,
      },
    });
    if (result.count > 0) {
      return;
    }

    await this.logUnexpectedVerificationSessionState(consumerId, session.id, db);
  }

  private async handleLifecycleUpdate(
    session: Stripe.Identity.VerificationSession,
    eventType: string,
    db: VerificationConsumerDb = this.prisma,
  ) {
    const consumerId = session.metadata?.consumerId;
    if (!consumerId) {
      this.logger.warn({ message: `Verification session missing consumerId in metadata` });
      return;
    }

    const status =
      eventType === STRIPE_EVENT.IDENTITY_VERIFICATION_SESSION_CANCELED
        ? STRIPE_IDENTITY_STATUS.CANCELED
        : STRIPE_IDENTITY_STATUS.REDACTED;

    const result = await db.consumerModel.updateMany({
      where: {
        id: consumerId,
        OR: [{ stripeIdentitySessionId: session.id }, { stripeIdentitySessionId: null }],
      },
      data: {
        legalVerified: false,
        stripeIdentityStatus: status,
        stripeIdentitySessionId: session.id,
        stripeIdentityLastErrorCode: null,
        stripeIdentityLastErrorReason: null,
        stripeIdentityUpdatedAt: new Date(),
        stripeIdentityVerifiedAt: null,
      },
    });
    if (result.count > 0) {
      return;
    }

    await this.logUnexpectedVerificationSessionState(consumerId, session.id, db);
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

  private isManagedVerificationEvent(eventType: string) {
    return (
      eventType === STRIPE_EVENT.IDENTITY_VERIFICATION_SESSION_VERIFIED ||
      eventType === STRIPE_EVENT.IDENTITY_VERIFICATION_SESSION_REQUIRES_INPUT ||
      eventType === STRIPE_EVENT.IDENTITY_VERIFICATION_SESSION_CANCELED ||
      eventType === STRIPE_EVENT.IDENTITY_VERIFICATION_SESSION_REDACTED
    );
  }

  private async processManagedVerificationEvent(event: Stripe.Event) {
    await this.prisma.$transaction(async (tx) => {
      const verificationDb: VerificationConsumerDb = tx as VerificationEventTx;
      await tx.stripeWebhookEventModel.create({
        data: { eventId: event.id },
      });

      switch (event.type) {
        case STRIPE_EVENT.IDENTITY_VERIFICATION_SESSION_VERIFIED: {
          this.logger.log({ message: `Webhook processing`, eventType: event.type });
          await this.handleVerified(event.data.object as Stripe.Identity.VerificationSession, verificationDb);
          this.logger.log({ message: `Webhook processed`, eventType: event.type });
          break;
        }

        case STRIPE_EVENT.IDENTITY_VERIFICATION_SESSION_REQUIRES_INPUT: {
          this.logger.log({ message: `Webhook processing`, eventType: event.type });
          await this.handleRequiresInput(event.data.object as Stripe.Identity.VerificationSession, verificationDb);
          this.logger.log({ message: `Webhook processed`, eventType: event.type });
          break;
        }

        case STRIPE_EVENT.IDENTITY_VERIFICATION_SESSION_CANCELED:
        case STRIPE_EVENT.IDENTITY_VERIFICATION_SESSION_REDACTED: {
          this.logger.log({ message: `Webhook processing`, eventType: event.type });
          await this.handleLifecycleUpdate(
            event.data.object as Stripe.Identity.VerificationSession,
            event.type,
            verificationDb,
          );
          this.logger.log({ message: `Webhook processed`, eventType: event.type });
          break;
        }

        default:
          break;
      }
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

  private async handleStripeSuccess(session: Stripe.Checkout.Session) {
    const paymentRequestId = session.metadata?.paymentRequestId;
    const consumerId = session.metadata?.consumerId;

    if (!paymentRequestId || !consumerId) return;

    let paymentIntentId: string | null = null;
    if (session.payment_intent) {
      if (typeof session.payment_intent === `string`) {
        paymentIntentId = session.payment_intent;
      } else {
        paymentIntentId = session.payment_intent.id ?? null;
      }
    }

    // Append-only: record outcome for each non-completed USER_PAYMENT entry; trigger syncs status (AGENTS 6.10)
    await this.prisma.$transaction(async (tx) => {
      const entries = await tx.ledgerEntryModel.findMany({
        where: {
          paymentRequestId,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
          status: { not: $Enums.TransactionStatus.COMPLETED },
        },
        select: { id: true },
      });
      for (const entry of entries) {
        await createOutcomeIdempotent(
          tx,
          {
            ledgerEntryId: entry.id,
            status: $Enums.TransactionStatus.COMPLETED,
            source: `stripe`,
            externalId: paymentIntentId ?? undefined,
          },
          this.logger,
        );
      }
      await tx.paymentRequestModel.updateMany({
        where: { id: paymentRequestId, status: { not: $Enums.TransactionStatus.COMPLETED } },
        data: {
          status: $Enums.TransactionStatus.COMPLETED,
          updatedBy: `stripe`,
        },
      });
    });

    // Collect and store the payment method used in this checkout session
    try {
      await this.collectPaymentMethodFromCheckout(session, consumerId);
    } catch {
      this.logger.warn({ message: `Failed to collect payment method from checkout session` });
      // Don't fail the entire webhook if payment method collection fails
    }
  }

  private async ensureStripeCustomer(consumerId: string) {
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

  // Manual migration method - can be called from an admin endpoint
  async migrateAllPaymentMethods() {
    this.logger.log({ message: `Payment method migration started` });

    try {
      const consumers = await this.prisma.consumerModel.findMany({
        include: { paymentMethods: true },
      });

      let totalAttached = 0;
      let totalFailed = 0;

      for (const consumer of consumers) {
        if (consumer.paymentMethods.length === 0) continue;

        this.logger.debug({ message: `Migrating consumer payment methods` });
        const { customerId } = await this.ensureStripeCustomer(consumer.id);

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
      this.logger.debug({ message: `Payment method attached to customer` });
    } catch (error: unknown) {
      const err = error as { type?: string; message?: string } | null | undefined;
      // Handle different types of attachment errors
      if (err?.type === `invalid_request_error` && err?.message?.includes(`previously used without being attached`)) {
        this.logger.debug({ message: `Payment method cannot be reused (used without customer), skipping storage` });
        return; // Don't store this payment method since it can't be reused
      } else if (err?.type === `invalid_request_error` && err?.message?.includes(`already attached`)) {
        this.logger.debug({ message: `Payment method already attached to customer, continuing` });
      } else {
        this.logger.warn({ message: `Payment method attachment warning` });
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
      this.logger.debug({ message: `Unsupported payment method type for storage`, type: paymentMethod.type });
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

  private async resolvePaymentRequestByPaymentIntent(paymentIntentId: string) {
    // Look up by outcome.externalId (payment intent id) or legacy ledger_entry.stripe_id
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
    const {
      paymentRequestId,
      payerId,
      requesterId,
      requesterEmail,
      currencyCode,
      requestAmount,
      amount,
      kind,
      stripeObjectId,
      metadata = {},
    } = params;

    if (!payerId) return;

    const kindLower = kind.toLowerCase();
    const idempotencyKeyPayer = stripeObjectId != null ? `reversal:${kindLower}:${stripeObjectId}:payer` : undefined;
    const idempotencyKeyRequester =
      stripeObjectId != null ? `reversal:${kindLower}:${stripeObjectId}:requester` : undefined;

    const rail = kind === `CHARGEBACK` ? $Enums.PaymentRail.STRIPE_CHARGEBACK : $Enums.PaymentRail.STRIPE_REFUND;
    const baseMetadata = {
      rail,
      reversalKind: kind,
      source: `stripe`,
      stripeObjectType: kind === `REFUND` ? `refund` : `dispute`,
      ...metadata,
    } as Prisma.InputJsonValue;

    const ledgerId = randomUUID();
    let appendedAmount = 0;

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`
          SELECT pg_advisory_xact_lock(hashtext((${paymentRequestId} || ':stripe-reversal-pr')::text)::bigint)
        `);

        const reversalEntries = await tx.ledgerEntryModel.findMany({
          where: {
            paymentRequestId,
            type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
            status: { in: [$Enums.TransactionStatus.COMPLETED, $Enums.TransactionStatus.PENDING] },
          },
          select: { amount: true },
        });
        const alreadyReversed = reversalEntries.reduce((sum, entry) => {
          const entryAmount = Number(entry.amount);
          return entryAmount > 0 ? sum + entryAmount : sum;
        }, 0);
        const remaining = requestAmount - alreadyReversed;
        const finalAmount = Math.min(amount, remaining);
        if (finalAmount <= 0) {
          return;
        }
        appendedAmount = finalAmount;

        if (requesterId) {
          await tx.$executeRaw(Prisma.sql`
            SELECT pg_advisory_xact_lock(hashtext((${requesterId} || ':stripe-reversal')::text)::bigint)
          `);

          // REFUND follows Stripe external source of truth. Once Stripe confirms refund,
          // internal reversal must be appended idempotently even if requester balance changed.
          if (kind === `CHARGEBACK`) {
            const requesterBalance = await this.balanceService.calculateInTransaction(tx, requesterId, currencyCode);
            if (requesterBalance < finalAmount) {
              throw new ServiceUnavailableException(errorCodes.INSUFFICIENT_REQUESTER_BALANCE_REVERSAL_STRIPE);
            }
          }
        }

        await tx.ledgerEntryModel.create({
          data: {
            ledgerId,
            consumerId: payerId,
            paymentRequestId,
            type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
            currencyCode,
            status: $Enums.TransactionStatus.COMPLETED,
            amount: appendedAmount,
            createdBy: `stripe`,
            updatedBy: `stripe`,
            metadata: baseMetadata,
            stripeId: stripeObjectId ?? undefined,
            idempotencyKey: idempotencyKeyPayer ?? undefined,
          },
        });

        if (requesterId) {
          await tx.ledgerEntryModel.create({
            data: {
              ledgerId,
              consumerId: requesterId,
              paymentRequestId,
              type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
              currencyCode,
              status: $Enums.TransactionStatus.COMPLETED,
              amount: -appendedAmount,
              createdBy: `stripe`,
              updatedBy: `stripe`,
              metadata: baseMetadata,
              stripeId: stripeObjectId ?? undefined,
              idempotencyKey: idempotencyKeyRequester ?? undefined,
            },
          });
        }
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === `P2002`) {
        this.logger.debug(`Reversal already created (idempotent skip)`);
        return;
      }
      throw err;
    }

    if (appendedAmount <= 0) {
      return;
    }

    await this.sendReversalEmails({
      paymentRequestId,
      payerId,
      requesterId,
      requesterEmail: requesterEmail ?? undefined,
      amount: appendedAmount,
      currencyCode,
      kind,
      reason: typeof metadata?.reason === `string` ? metadata.reason : null,
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
    const { paymentRequestId, payerId, requesterId, requesterEmail, amount, currencyCode, kind, reason } = params;
    const consumerIds = [payerId, ...(requesterId ? [requesterId] : [])];
    const consumers = await this.prisma.consumerModel.findMany({
      where: { id: { in: consumerIds } },
      select: { id: true, email: true },
    });

    const payer = consumers.find((consumer) => consumer.id === payerId);
    const requester = requesterId ? consumers.find((consumer) => consumer.id === requesterId) : null;
    const requesterEmailResolved = requester?.email ?? requesterEmail ?? ``;

    if (!payer?.email) return;

    if (kind === `REFUND`) {
      await this.mailingService.sendPaymentRefundEmail({
        recipientEmail: payer.email,
        counterpartyEmail: requesterEmailResolved,
        amount,
        currencyCode,
        reason,
        paymentRequestId,
        role: `payer`,
      });
      if (requesterEmailResolved) {
        await this.mailingService.sendPaymentRefundEmail({
          recipientEmail: requesterEmailResolved,
          counterpartyEmail: payer.email,
          amount,
          currencyCode,
          reason,
          paymentRequestId,
          role: `requester`,
        });
      }
      return;
    }

    await this.mailingService.sendPaymentChargebackEmail({
      recipientEmail: payer.email,
      counterpartyEmail: requesterEmailResolved,
      amount,
      currencyCode,
      reason,
      paymentRequestId,
      role: `payer`,
    });
    if (requesterEmailResolved) {
      await this.mailingService.sendPaymentChargebackEmail({
        recipientEmail: requesterEmailResolved,
        counterpartyEmail: payer.email,
        amount,
        currencyCode,
        reason,
        paymentRequestId,
        role: `requester`,
      });
    }
  }

  private async handleChargeRefunded(charge: Stripe.Charge) {
    const paymentIntentId =
      typeof charge.payment_intent === `string` ? charge.payment_intent : charge.payment_intent?.id;
    if (!paymentIntentId) return;

    const paymentRequest = await this.resolvePaymentRequestByPaymentIntent(paymentIntentId);
    if (!paymentRequest) return;

    const requestAmount = Number(paymentRequest.amount);
    const digits = getCurrencyFractionDigits(paymentRequest.currencyCode);

    for (const refund of charge.refunds?.data ?? []) {
      if (refund.status && refund.status !== `succeeded`) continue;
      const refundAmount = refund.amount / 10 ** digits;

      await this.createStripeReversal({
        paymentRequestId: paymentRequest.id,
        payerId: paymentRequest.payerId,
        requesterId: paymentRequest.requesterId,
        requesterEmail: paymentRequest.requesterEmail,
        currencyCode: paymentRequest.currencyCode,
        requestAmount,
        amount: refundAmount,
        kind: `REFUND`,
        stripeObjectId: refund.id,
        metadata: {
          stripeChargeId: charge.id,
          stripeRefundId: refund.id,
          stripePaymentIntentId: paymentIntentId,
          reason: refund.reason ?? null,
        },
      });
    }
  }

  private async handleRefundUpdated(refund: Stripe.Refund) {
    const status =
      refund.status === `succeeded`
        ? $Enums.TransactionStatus.COMPLETED
        : refund.status === `failed` || refund.status === `canceled`
          ? $Enums.TransactionStatus.DENIED
          : $Enums.TransactionStatus.PENDING;
    // Keep refund outcome idempotency transition-scoped so state can progress
    // (e.g. pending -> completed) under at-least-once webhook delivery.
    const transitionExternalId = `refund-update:${refund.id}:${status}`;

    await this.prisma.$transaction(async (tx) => {
      const entries = await tx.ledgerEntryModel.findMany({
        where: { stripeId: refund.id, type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL },
        select: { id: true },
      });
      for (const entry of entries) {
        await createOutcomeIdempotent(
          tx,
          {
            ledgerEntryId: entry.id,
            status,
            source: `stripe`,
            externalId: transitionExternalId,
          },
          this.logger,
        );
      }
    });
  }

  private async handleChargeDispute(dispute: Stripe.Dispute) {
    if (!dispute.charge || typeof dispute.charge !== `string`) return;

    const charge = await this.stripe.charges.retrieve(dispute.charge);
    const paymentIntentId =
      typeof charge.payment_intent === `string` ? charge.payment_intent : charge.payment_intent?.id;
    if (!paymentIntentId) return;

    const paymentRequest = await this.resolvePaymentRequestByPaymentIntent(paymentIntentId);
    if (!paymentRequest) return;

    await this.recordDisputeStatus({
      paymentIntentId,
      dispute,
    });

    if (dispute.status !== `lost`) return;

    const existingManualChargeback = await this.prisma.ledgerEntryModel.findMany({
      where: {
        paymentRequestId: paymentRequest.id,
        type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
      },
      select: { metadata: true },
    });

    const hasManualChargeback = existingManualChargeback.some((entry) => {
      if (!entry.metadata || typeof entry.metadata !== `object` || Array.isArray(entry.metadata)) return false;
      const metadata = entry.metadata as Record<string, unknown>;
      return metadata.source === `admin` && metadata.stripeObjectType === `manual_chargeback`;
    });

    if (hasManualChargeback) return;

    const requestAmount = Number(paymentRequest.amount);
    const digits = getCurrencyFractionDigits(paymentRequest.currencyCode);
    const disputeAmount = dispute.amount / 10 ** digits;

    await this.createStripeReversal({
      paymentRequestId: paymentRequest.id,
      payerId: paymentRequest.payerId,
      requesterId: paymentRequest.requesterId,
      requesterEmail: paymentRequest.requesterEmail,
      currencyCode: paymentRequest.currencyCode,
      requestAmount,
      amount: disputeAmount,
      kind: `CHARGEBACK`,
      stripeObjectId: dispute.id,
      metadata: {
        stripeChargeId: charge.id,
        stripeDisputeId: dispute.id,
        stripePaymentIntentId: paymentIntentId,
        reason: dispute.reason ?? null,
        disputeStatus: dispute.status,
      },
    });
  }

  private async recordDisputeStatus(params: { paymentIntentId: string; dispute: Stripe.Dispute }) {
    const { paymentIntentId, dispute } = params;
    const createDisputeIfMissing = async (ledgerEntryId: string) => {
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`
          SELECT pg_advisory_xact_lock(hashtext((${ledgerEntryId} || ':' || ${dispute.id} || ':dispute')::text)::bigint)
        `);
        const existingDispute = await tx.ledgerEntryDisputeModel.findFirst({
          where: { ledgerEntryId, stripeDisputeId: dispute.id },
          select: { id: true },
        });
        if (existingDispute) {
          return;
        }
        try {
          await tx.ledgerEntryDisputeModel.create({
            data: {
              ledgerEntryId,
              stripeDisputeId: dispute.id,
              metadata: {
                status: dispute.status,
                amount: dispute.amount,
                reason: dispute.reason ?? null,
                updatedAt: new Date().toISOString(),
              },
            },
          });
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === `P2002`) {
            return;
          }
          throw err;
        }
      });
    };

    const entry = await this.prisma.ledgerEntryModel.findFirst({
      where: {
        stripeId: paymentIntentId,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
      },
      select: { id: true },
      orderBy: { createdAt: `desc` },
    });
    if (!entry) {
      const byOutcome = await this.prisma.ledgerEntryOutcomeModel.findFirst({
        where: { externalId: paymentIntentId },
        orderBy: { createdAt: `desc` },
        select: { ledgerEntryId: true },
      });
      if (!byOutcome) return;
      await createDisputeIfMissing(byOutcome.ledgerEntryId);
      return;
    }

    // Append-only: record dispute in ledger_entry_dispute (AGENTS 6.10)
    await createDisputeIfMissing(entry.id);
  }
}
