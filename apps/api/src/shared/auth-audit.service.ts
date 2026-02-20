import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { errorCodes } from '@remoola/shared-constants';

import { envs } from '../envs';
import { PrismaService } from './prisma.service';

const IDENTITY_TYPE_CONSUMER = `consumer`;
const IDENTITY_TYPE_ADMIN = `admin`;

export type AuthIdentityType = typeof IDENTITY_TYPE_CONSUMER | typeof IDENTITY_TYPE_ADMIN;

export const AUTH_IDENTITY_TYPES = {
  consumer: IDENTITY_TYPE_CONSUMER,
  admin: IDENTITY_TYPE_ADMIN,
} as const;

export const AUTH_AUDIT_EVENTS = {
  login_success: `login_success`,
  login_failure: `login_failure`,
  logout: `logout`,
} as const;

export type AuthAuditEvent = (typeof AUTH_AUDIT_EVENTS)[keyof typeof AUTH_AUDIT_EVENTS];

export type RecordAuditParams = {
  identityType: AuthIdentityType;
  identityId?: string | null;
  email: string;
  event: AuthAuditEvent;
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AuthAuditService {
  private readonly logger = new Logger(AuthAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordAudit(params: RecordAuditParams): Promise<void> {
    const { identityType, identityId, email, event, ipAddress, userAgent } = params;
    const normalizedEmail = email.trim().toLowerCase();
    try {
      await this.prisma.authAuditLogModel.create({
        data: {
          identityType,
          identityId: identityId ?? null,
          email: normalizedEmail,
          event,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
      });
    } catch (err) {
      this.logger.warn(`AuthAudit: failed to record audit`, {
        event,
        message: err instanceof Error ? err.message : `Unknown`,
      });
    }
  }

  /**
   * Throws if account is locked (too many failed attempts) or per-email rate limit exceeded.
   * Call before attempting password verification.
   */
  async checkLockoutAndRateLimit(identityType: AuthIdentityType, email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const now = new Date();

    const lockout = await this.prisma.authLoginLockoutModel.findUnique({
      where: {
        identityType_email: { identityType, email: normalizedEmail },
      },
    });

    if (lockout?.lockedUntil && lockout.lockedUntil > now) {
      throw new BadRequestException(errorCodes.ACCOUNT_TEMPORARILY_LOCKED);
    }

    const windowMinutes = envs.AUTH_PER_EMAIL_RATE_WINDOW_MINUTES;
    const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);
    const count = await this.prisma.authAuditLogModel.count({
      where: {
        identityType,
        email: normalizedEmail,
        createdAt: { gte: windowStart },
      },
    });

    if (count >= envs.AUTH_PER_EMAIL_RATE_LIMIT) {
      throw new BadRequestException(errorCodes.TOO_MANY_LOGIN_ATTEMPTS);
    }
  }

  /**
   * Record a failed login attempt. If attempts >= max, set locked_until.
   */
  async recordFailedAttempt(identityType: AuthIdentityType, email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const now = new Date();
    const maxAttempts = envs.AUTH_MAX_FAILED_ATTEMPTS;
    const lockoutMinutes = envs.AUTH_LOCKOUT_DURATION_MINUTES;

    const lockedUntilValue = new Date(now.getTime() + lockoutMinutes * 60 * 1000);

    const lockout = await this.prisma.authLoginLockoutModel.upsert({
      where: {
        identityType_email: { identityType, email: normalizedEmail },
      },
      create: {
        identityType,
        email: normalizedEmail,
        attemptCount: 1,
        firstAttemptAt: now,
        lockedUntil: maxAttempts <= 1 ? lockedUntilValue : null,
      },
      update: {
        attemptCount: { increment: 1 },
      },
    });

    const newCount = lockout.attemptCount;
    if (newCount >= maxAttempts) {
      await this.prisma.authLoginLockoutModel.update({
        where: {
          identityType_email: { identityType, email: normalizedEmail },
        },
        data: {
          lockedUntil: lockedUntilValue,
          firstAttemptAt: lockout.firstAttemptAt ?? now,
        },
      });
    }
  }

  /**
   * Clear lockout and failure count after successful login.
   */
  async clearLockout(identityType: AuthIdentityType, email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    try {
      await this.prisma.authLoginLockoutModel.deleteMany({
        where: {
          identityType,
          email: normalizedEmail,
        },
      });
    } catch {
      // ignore
    }
  }
}
