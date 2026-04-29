import { Inject, Injectable, Logger } from '@nestjs/common';

import { type Prisma } from '@remoola/database-2';

import { STRIPE_EVENT } from './events';
import { CONSUMER_STRIPE_WEBHOOK_CLIENT } from './stripe-webhook.tokens';
import { PrismaService } from '../../../shared/prisma.service';
import { STRIPE_IDENTITY_STATUS } from '../../../shared-common';
import { ConsumerPaymentsPoliciesService } from '../payments/consumer-payments-policies.service';

import type Stripe from 'stripe';

type VerificationConsumerDb = Pick<PrismaService, `consumerModel`>;
type VerificationEventTx = Pick<Prisma.TransactionClient, `consumerModel` | `stripeWebhookEventModel`>;
type VerificationSessionState = {
  stripeIdentityStatus: string | null;
  stripeIdentitySessionId: string | null;
  legalVerified?: boolean | null;
};

@Injectable()
export class StripeWebhookVerificationService {
  private readonly logger = new Logger(StripeWebhookVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly consumerPaymentsPoliciesService: ConsumerPaymentsPoliciesService,
    @Inject(CONSUMER_STRIPE_WEBHOOK_CLIENT) private readonly stripe: Stripe,
  ) {}

  async startVerifyMeStripeSession(consumerId: string) {
    await this.consumerPaymentsPoliciesService.assertProfileCompleteForVerification(consumerId);
    const verificationState = await this.getVerificationSessionState(consumerId);
    const reusableSession = await this.getReusableVerificationSession(consumerId, verificationState);
    if (reusableSession) {
      return reusableSession;
    }

    const session = await this.stripe.identity.verificationSessions.create(
      {
        type: `document`,
        metadata: { consumerId },
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

  isManagedVerificationEvent(eventType: string) {
    return (
      eventType === STRIPE_EVENT.IDENTITY_VERIFICATION_SESSION_VERIFIED ||
      eventType === STRIPE_EVENT.IDENTITY_VERIFICATION_SESSION_REQUIRES_INPUT ||
      eventType === STRIPE_EVENT.IDENTITY_VERIFICATION_SESSION_CANCELED ||
      eventType === STRIPE_EVENT.IDENTITY_VERIFICATION_SESSION_REDACTED
    );
  }

  async processManagedVerificationEvent(
    event: Stripe.Event,
    handlers?: {
      handleVerified?: (
        session: Stripe.Identity.VerificationSession,
        db: VerificationConsumerDb,
      ) => Promise<unknown> | unknown;
      handleRequiresInput?: (
        session: Stripe.Identity.VerificationSession,
        db: VerificationConsumerDb,
      ) => Promise<unknown> | unknown;
      handleLifecycleUpdate?: (
        session: Stripe.Identity.VerificationSession,
        eventType: string,
        db: VerificationConsumerDb,
      ) => Promise<unknown> | unknown;
    },
  ) {
    const handleVerified = handlers?.handleVerified ?? ((session, db) => this.handleVerified(session, db));
    const handleRequiresInput =
      handlers?.handleRequiresInput ?? ((session, db) => this.handleRequiresInput(session, db));
    const handleLifecycleUpdate =
      handlers?.handleLifecycleUpdate ??
      ((session, eventType, db) => this.handleLifecycleUpdate(session, eventType, db));

    await this.prisma.$transaction(async (tx) => {
      const verificationDb: VerificationConsumerDb = tx as VerificationEventTx;
      await tx.stripeWebhookEventModel.create({
        data: { eventId: event.id },
      });

      switch (event.type) {
        case STRIPE_EVENT.IDENTITY_VERIFICATION_SESSION_VERIFIED: {
          this.logger.log({ message: `Webhook processing`, eventType: event.type });
          await handleVerified(event.data.object as Stripe.Identity.VerificationSession, verificationDb);
          this.logger.log({ message: `Webhook processed`, eventType: event.type });
          break;
        }

        case STRIPE_EVENT.IDENTITY_VERIFICATION_SESSION_REQUIRES_INPUT: {
          this.logger.log({ message: `Webhook processing`, eventType: event.type });
          await handleRequiresInput(event.data.object as Stripe.Identity.VerificationSession, verificationDb);
          this.logger.log({ message: `Webhook processed`, eventType: event.type });
          break;
        }

        case STRIPE_EVENT.IDENTITY_VERIFICATION_SESSION_CANCELED:
        case STRIPE_EVENT.IDENTITY_VERIFICATION_SESSION_REDACTED: {
          this.logger.log({ message: `Webhook processing`, eventType: event.type });
          await handleLifecycleUpdate(
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

  async handleVerified(session: Stripe.Identity.VerificationSession, db: VerificationConsumerDb = this.prisma) {
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

  async handleRequiresInput(session: Stripe.Identity.VerificationSession, db: VerificationConsumerDb = this.prisma) {
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

  async handleLifecycleUpdate(
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
}
