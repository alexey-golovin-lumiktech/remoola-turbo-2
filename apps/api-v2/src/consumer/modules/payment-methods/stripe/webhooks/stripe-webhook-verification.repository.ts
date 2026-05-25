import { Injectable, type Logger } from '@nestjs/common';

import { type Prisma } from '@remoola/database-2';

import { PrismaService } from '../../../../../shared/prisma.service';

export type VerificationConsumerDb = Pick<PrismaService, `consumerModel`>;
type VerificationEventTx = Pick<Prisma.TransactionClient, `consumerModel` | `stripeWebhookEventModel`>;

export type VerificationSessionState = {
  stripeIdentityStatus: string | null;
  stripeIdentitySessionId: string | null;
  legalVerified?: boolean | null;
};

type VerificationPersonalDetailsUpsert = {
  upsert: {
    create: {
      firstName: string | null;
      lastName: string | null;
      dateOfBirth: Date | null;
      citizenOf: string | null;
      passportOrIdNumber: string | null;
    };
    update: {
      firstName: string | null;
      lastName: string | null;
      dateOfBirth: Date | null;
      citizenOf: string | null;
      passportOrIdNumber: string | null;
    };
  };
};

@Injectable()
export class StripeWebhookVerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getVerificationSessionState(
    consumerId: string,
    db?: VerificationConsumerDb,
  ): Promise<VerificationSessionState | null> {
    const client = db ?? this.prisma;
    return client.consumerModel.findUnique({
      where: { id: consumerId },
      select: {
        legalVerified: true,
        stripeIdentityStatus: true,
        stripeIdentitySessionId: true,
      },
    });
  }

  async claimStartedSession(params: {
    consumerId: string;
    priorSessionId: string | null;
    sessionId: string;
    now: Date;
    pendingSubmissionStatus: string;
  }) {
    return this.prisma.consumerModel.updateMany({
      where: { id: params.consumerId, stripeIdentitySessionId: params.priorSessionId },
      data: {
        stripeIdentityStatus: params.pendingSubmissionStatus,
        stripeIdentitySessionId: params.sessionId,
        stripeIdentityLastErrorCode: null,
        stripeIdentityLastErrorReason: null,
        stripeIdentityStartedAt: params.now,
        stripeIdentityUpdatedAt: params.now,
        stripeIdentityVerifiedAt: null,
      },
    });
  }

  async runManagedVerificationEvent(eventId: string, handler: (db: VerificationConsumerDb) => Promise<void> | void) {
    await this.prisma.$transaction(async (tx) => {
      const verificationDb: VerificationConsumerDb = tx as VerificationEventTx;
      await tx.stripeWebhookEventModel.create({
        data: { eventId },
      });
      await handler(verificationDb);
    });
  }

  async findConsumerForVerificationSession(
    consumerId: string,
    sessionId: string,
    logger: Logger,
    db?: VerificationConsumerDb,
  ) {
    const client = db ?? this.prisma;
    const consumer = await client.consumerModel.findFirst({
      where: {
        id: consumerId,
        OR: [{ stripeIdentitySessionId: sessionId }, { stripeIdentitySessionId: null }],
      },
      include: { personalDetails: true },
    });
    if (consumer) {
      return consumer;
    }

    await this.logUnexpectedVerificationSessionState(consumerId, sessionId, logger, client);
    return null;
  }

  async applyVerifiedConsumerUpdate(
    params: {
      consumerId: string;
      sessionId: string;
      verifiedStatus: string;
      personalDetails?: VerificationPersonalDetailsUpsert;
    },
    db?: VerificationConsumerDb,
  ) {
    const client = db ?? this.prisma;
    return client.consumerModel.update({
      where: { id: params.consumerId },
      data: {
        legalVerified: true,
        stripeIdentityStatus: params.verifiedStatus,
        stripeIdentitySessionId: params.sessionId,
        stripeIdentityLastErrorCode: null,
        stripeIdentityLastErrorReason: null,
        stripeIdentityUpdatedAt: new Date(),
        stripeIdentityVerifiedAt: new Date(),
        ...(params.personalDetails && { personalDetails: params.personalDetails }),
      },
      include: { personalDetails: !!params.personalDetails },
    });
  }

  async applyRequiresInputState(
    params: {
      consumerId: string;
      sessionId: string;
      status: string;
      lastErrorCode?: string | null;
      lastErrorReason?: string | null;
    },
    db?: VerificationConsumerDb,
  ) {
    const client = db ?? this.prisma;
    return client.consumerModel.updateMany({
      where: {
        id: params.consumerId,
        OR: [{ stripeIdentitySessionId: params.sessionId }, { stripeIdentitySessionId: null }],
      },
      data: {
        legalVerified: false,
        stripeIdentityStatus: params.status,
        stripeIdentitySessionId: params.sessionId,
        stripeIdentityLastErrorCode: params.lastErrorCode ?? null,
        stripeIdentityLastErrorReason: params.lastErrorReason ?? null,
        stripeIdentityUpdatedAt: new Date(),
        stripeIdentityVerifiedAt: null,
      },
    });
  }

  async applyLifecycleState(
    params: {
      consumerId: string;
      sessionId: string;
      status: string;
    },
    db?: VerificationConsumerDb,
  ) {
    const client = db ?? this.prisma;
    return client.consumerModel.updateMany({
      where: {
        id: params.consumerId,
        OR: [{ stripeIdentitySessionId: params.sessionId }, { stripeIdentitySessionId: null }],
      },
      data: {
        legalVerified: false,
        stripeIdentityStatus: params.status,
        stripeIdentitySessionId: params.sessionId,
        stripeIdentityLastErrorCode: null,
        stripeIdentityLastErrorReason: null,
        stripeIdentityUpdatedAt: new Date(),
        stripeIdentityVerifiedAt: null,
      },
    });
  }

  async logUnexpectedVerificationSessionState(
    consumerId: string,
    sessionId: string,
    logger: Logger,
    db?: VerificationConsumerDb,
  ) {
    const client = db ?? this.prisma;
    const consumer = await client.consumerModel.findUnique({
      where: { id: consumerId },
      select: { id: true, stripeIdentitySessionId: true },
    });
    if (!consumer) {
      logger.warn({ message: `Consumer not found for verification session` });
      return;
    }

    logger.warn({
      message: `Ignoring stale verification session update`,
      consumerId,
      incomingSessionId: sessionId,
      currentSessionId: consumer.stripeIdentitySessionId,
    });
  }
}
