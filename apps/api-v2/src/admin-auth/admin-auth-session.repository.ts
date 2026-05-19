import { Injectable } from '@nestjs/common';

import { type Prisma } from '@remoola/database-2';

import { type AdminAuthSessionRevokeReason } from './admin-auth-session-reasons';
import { buildAuthSessionRevokePayload } from '../guards/auth-session-revoke-payload';
import { PrismaService } from '../shared/prisma.service';

export { AdminAuthSessionRotationConflictError } from '../guards/auth-session-rotation-conflict.error';

type CreateIssuedSessionParams = {
  sessionId: string;
  adminId: string;
  sessionFamilyId: string;
  refreshTokenHash: string;
  accessTokenHash: string;
  expiresAt: Date;
  issuedAt: Date;
};

@Injectable()
export class AdminAuthSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByIdForRefresh(sessionId: string, adminId: string) {
    return this.prisma.adminAuthSessionModel.findFirst({
      where: { id: sessionId, adminId },
      select: {
        id: true,
        sessionFamilyId: true,
        refreshTokenHash: true,
        expiresAt: true,
        revokedAt: true,
        replacedById: true,
      },
    });
  }

  createIssuedSession(params: CreateIssuedSessionParams, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;

    return db.adminAuthSessionModel.create({
      data: {
        id: params.sessionId,
        adminId: params.adminId,
        sessionFamilyId: params.sessionFamilyId,
        refreshTokenHash: params.refreshTokenHash,
        accessTokenHash: params.accessTokenHash,
        expiresAt: params.expiresAt,
        lastUsedAt: params.issuedAt,
      },
    });
  }

  markSessionRotated(
    tx: Prisma.TransactionClient,
    params: {
      previousSessionId: string;
      adminId: string;
      expectedRefreshTokenHash: string;
      invalidatedReason: AdminAuthSessionRevokeReason;
      nextSession: CreateIssuedSessionParams;
      now: Date;
    },
  ) {
    return tx.adminAuthSessionModel.updateMany({
      where: {
        id: params.previousSessionId,
        adminId: params.adminId,
        refreshTokenHash: params.expectedRefreshTokenHash,
        revokedAt: null,
        replacedById: null,
        expiresAt: { gte: params.now },
      },
      data: {
        revokedAt: params.now,
        replacedById: params.nextSession.sessionId,
        invalidatedReason: params.invalidatedReason,
        lastUsedAt: params.now,
      },
    });
  }

  revokeScopedSessionByRefreshToken(params: {
    sessionId: string;
    adminId: string;
    refreshTokenHash: string;
    reason: AdminAuthSessionRevokeReason;
  }) {
    return this.prisma.adminAuthSessionModel.updateMany({
      where: {
        id: params.sessionId,
        adminId: params.adminId,
        refreshTokenHash: params.refreshTokenHash,
        revokedAt: null,
      },
      data: buildAuthSessionRevokePayload(params.reason),
    });
  }

  revokeSessionFamily(sessionFamilyId: string, reason: AdminAuthSessionRevokeReason) {
    return this.prisma.adminAuthSessionModel.updateMany({
      where: { sessionFamilyId, revokedAt: null },
      data: buildAuthSessionRevokePayload(reason),
    });
  }

  findOwnedSessionForRevoke(adminId: string, sessionId: string) {
    return this.prisma.adminAuthSessionModel.findFirst({
      where: { id: sessionId, adminId },
      select: { id: true, revokedAt: true, admin: { select: { email: true } } },
    });
  }

  markSessionRevokedById(sessionId: string, reason: AdminAuthSessionRevokeReason) {
    return this.prisma.adminAuthSessionModel.update({
      where: { id: sessionId },
      data: buildAuthSessionRevokePayload(reason),
    });
  }

  findOwnedSessionId(adminId: string, sessionId: string) {
    return this.prisma.adminAuthSessionModel.findFirst({
      where: { id: sessionId, adminId },
      select: { id: true },
    });
  }

  listRecentByAdminId(adminId: string, cutoff: Date) {
    return this.prisma.adminAuthSessionModel.findMany({
      where: {
        adminId,
        OR: [{ revokedAt: null }, { revokedAt: { gte: cutoff } }],
      },
      orderBy: { createdAt: `desc` },
      select: {
        id: true,
        sessionFamilyId: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        invalidatedReason: true,
        replacedById: true,
      },
    });
  }
}
