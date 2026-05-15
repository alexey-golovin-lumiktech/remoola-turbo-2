import { Injectable } from '@nestjs/common';

import { type AuthAuditEvent, type AuthIdentityType } from './auth-audit.service';
import { PrismaService } from './prisma.service';

type CreateAuditLogParams = {
  identityType: AuthIdentityType;
  identityId?: string | null;
  email: string;
  event: AuthAuditEvent;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type UpsertFailedAttemptParams = {
  identityType: AuthIdentityType;
  email: string;
  now: Date;
  lockedUntil: Date | null;
};

type SetLockedUntilParams = {
  identityType: AuthIdentityType;
  email: string;
  lockedUntil: Date;
  firstAttemptAt: Date;
};

@Injectable()
export class AuthAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  createAuditLog(params: CreateAuditLogParams) {
    return this.prisma.authAuditLogModel.create({
      data: {
        identityType: params.identityType,
        identityId: params.identityId ?? null,
        email: params.email,
        event: params.event,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  }

  upsertFailedAttempt(params: UpsertFailedAttemptParams) {
    return this.prisma.authLoginLockoutModel.upsert({
      where: {
        identityType_email: { identityType: params.identityType, email: params.email },
      },
      create: {
        identityType: params.identityType,
        email: params.email,
        attemptCount: 1,
        firstAttemptAt: params.now,
        lockedUntil: params.lockedUntil,
      },
      update: {
        attemptCount: { increment: 1 },
      },
    });
  }

  setLockedUntil(params: SetLockedUntilParams) {
    return this.prisma.authLoginLockoutModel.update({
      where: {
        identityType_email: { identityType: params.identityType, email: params.email },
      },
      data: {
        lockedUntil: params.lockedUntil,
        firstAttemptAt: params.firstAttemptAt,
      },
    });
  }

  clearLockout(identityType: AuthIdentityType, email: string) {
    return this.prisma.authLoginLockoutModel.deleteMany({
      where: {
        identityType,
        email,
      },
    });
  }
}
