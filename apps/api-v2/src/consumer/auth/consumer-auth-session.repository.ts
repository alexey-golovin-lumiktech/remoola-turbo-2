import { Injectable } from '@nestjs/common';

import { type ConsumerAppScope } from '@remoola/api-types';
import { type Prisma } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';

type PendingSessionParams = {
  sessionId?: string;
  consumerId: string;
  appScope: ConsumerAppScope;
  sessionFamilyId: string;
  refreshTokenHash: string;
  expiresAt: Date;
};

type FinalizedSessionParams = {
  sessionId: string;
  sessionFamilyId: string;
  accessTokenHash: string;
  refreshTokenHash: string;
  finalizedAt: Date;
};

export class ConsumerAuthSessionRotationConflictError extends Error {
  constructor() {
    super(`Consumer auth session rotation lost the compare-and-swap guard`);
    this.name = `ConsumerAuthSessionRotationConflictError`;
  }
}

@Injectable()
export class ConsumerAuthSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByIdForRefresh(sessionId: string, consumerId: string, appScope: ConsumerAppScope) {
    return this.prisma.authSessionModel.findFirst({
      where: { id: sessionId, consumerId, appScope },
      select: {
        id: true,
        consumerId: true,
        sessionFamilyId: true,
        appScope: true,
        refreshTokenHash: true,
        expiresAt: true,
        revokedAt: true,
        replacedById: true,
      },
    });
  }

  revokeSessionFamily(sessionFamilyId: string, reason: string) {
    return this.prisma.authSessionModel.updateMany({
      where: { sessionFamilyId, revokedAt: null },
      data: { revokedAt: new Date(), invalidatedReason: reason, lastUsedAt: new Date() },
    });
  }

  revokeScopedSessionByRefreshToken(params: {
    sessionId: string;
    consumerId: string;
    appScope: ConsumerAppScope;
    refreshTokenHash: string;
  }) {
    return this.prisma.authSessionModel.updateMany({
      where: {
        id: params.sessionId,
        consumerId: params.consumerId,
        appScope: params.appScope,
        refreshTokenHash: params.refreshTokenHash,
        revokedAt: null,
      },
      data: { revokedAt: new Date(), invalidatedReason: `logout`, lastUsedAt: new Date() },
    });
  }

  countActiveByConsumerId(consumerId: string) {
    return this.prisma.authSessionModel.count({
      where: { consumerId, revokedAt: null },
    });
  }

  revokeAllByConsumerId(consumerId: string, reason: string) {
    return this.prisma.authSessionModel.updateMany({
      where: { consumerId, revokedAt: null },
      data: { revokedAt: new Date(), invalidatedReason: reason, lastUsedAt: new Date() },
    });
  }

  createPendingSession(params: PendingSessionParams, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;

    return db.authSessionModel.create({
      data: {
        id: params.sessionId,
        consumerId: params.consumerId,
        appScope: params.appScope,
        sessionFamilyId: params.sessionFamilyId,
        refreshTokenHash: params.refreshTokenHash,
        expiresAt: params.expiresAt,
      },
    });
  }

  finalizeIssuedSession(params: FinalizedSessionParams, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;

    return db.authSessionModel.update({
      where: { id: params.sessionId },
      data: {
        accessTokenHash: params.accessTokenHash,
        sessionFamilyId: params.sessionFamilyId,
        refreshTokenHash: params.refreshTokenHash,
        lastUsedAt: params.finalizedAt,
      },
    });
  }

  markSessionRotated(
    tx: Prisma.TransactionClient,
    params: {
      previousSessionId: string;
      consumerId: string;
      appScope: ConsumerAppScope;
      expectedRefreshTokenHash: string;
      replacedById: string;
      now: Date;
    },
  ) {
    return tx.authSessionModel.updateMany({
      where: {
        id: params.previousSessionId,
        consumerId: params.consumerId,
        appScope: params.appScope,
        refreshTokenHash: params.expectedRefreshTokenHash,
        revokedAt: null,
        replacedById: null,
        expiresAt: { gte: params.now },
      },
      data: {
        revokedAt: params.now,
        replacedById: params.replacedById,
        invalidatedReason: `rotated`,
        lastUsedAt: params.now,
      },
    });
  }
}
