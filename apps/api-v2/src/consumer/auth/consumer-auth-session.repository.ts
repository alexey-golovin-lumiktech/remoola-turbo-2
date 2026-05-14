import { Injectable } from '@nestjs/common';

import { type ConsumerAppScope } from '@remoola/api-types';

import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class ConsumerAuthSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByIdForRefresh(sessionId: string, consumerId: string, appScope: ConsumerAppScope) {
    return this.prisma.authSessionModel.findFirst({
      where: { id: sessionId, consumerId, appScope },
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
}
