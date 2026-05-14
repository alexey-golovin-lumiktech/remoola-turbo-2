import { Injectable } from '@nestjs/common';

import { type ConsumerAppScope } from '@remoola/api-types';

import { PrismaService } from '../shared/prisma.service';

@Injectable()
export class AuthSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveConsumerSession(sessionId: string, consumerId: string, appScope: ConsumerAppScope) {
    return this.prisma.authSessionModel.findFirst({
      where: { id: sessionId, consumerId, appScope, revokedAt: null },
    });
  }

  findActiveAdminSession(sessionId: string, adminId: string) {
    return this.prisma.adminAuthSessionModel.findFirst({
      where: { id: sessionId, adminId, revokedAt: null },
    });
  }
}
