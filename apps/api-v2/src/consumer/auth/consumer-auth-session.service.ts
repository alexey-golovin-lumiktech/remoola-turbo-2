import { randomUUID } from 'crypto';

import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { type ConsumerAppScope } from '@remoola/api-types';
import { type ConsumerModel } from '@remoola/database-2';
import { oauthCrypto } from '@remoola/security-utils';
import { errorCodes } from '@remoola/shared-constants';

import {
  ConsumerAuthSessionRepository,
  ConsumerAuthSessionRotationConflictError,
} from './consumer-auth-session.repository';
import { ConsumerIdentityRepository } from './consumer-identity.repository';
import { type IJwtTokenPayload } from '../../dtos/consumer';
import { envs } from '../../envs';
import { AuthAuditService, AUTH_AUDIT_EVENTS, AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { secureCompare } from '../../shared-common';

type LoginContext = { ipAddress?: string | null; userAgent?: string | null };

@Injectable()
export class ConsumerAuthSessionService {
  private readonly logger = new Logger(ConsumerAuthSessionService.name);
  private static readonly accessRole = `USER` as const;
  private static readonly accessPermissions = [`contacts.read`] as const;

  constructor(
    private readonly jwtService: JwtService,
    private readonly authAudit: AuthAuditService,
    private readonly originResolver: OriginResolverService,
    private readonly consumerIdentityRepository: ConsumerIdentityRepository,
    private readonly sessionRepository: ConsumerAuthSessionRepository,
    private readonly transactions: PrismaTransactionRunner,
  ) {}

  async refreshAccess(refreshToken: string, appScope: ConsumerAppScope, ctx?: LoginContext) {
    let verified: IJwtTokenPayload;
    try {
      verified = this.jwtService.verify<IJwtTokenPayload>(refreshToken, { secret: envs.JWT_REFRESH_SECRET });
    } catch {
      this.logger.warn(`ConsumerAuth: refresh token verification failed`);
      await this.authAudit.recordAudit({
        identityType: AUTH_IDENTITY_TYPES.consumer,
        email: `unknown`,
        event: AUTH_AUDIT_EVENTS.refresh_failure,
        ipAddress: ctx?.ipAddress,
        userAgent: ctx?.userAgent,
      });
      throw new UnauthorizedException(errorCodes.INVALID_REFRESH_TOKEN);
    }

    const identityId = this.resolveIdentityId(verified);
    const sessionId = verified.sid;
    const tokenAppScope = this.originResolver.validateConsumerAppScope(verified.appScope);
    if (!identityId || !sessionId || !this.isRefreshPayload(verified) || !tokenAppScope || tokenAppScope !== appScope) {
      this.logger.warn(`ConsumerAuth: invalid refresh payload`);
      throw new UnauthorizedException(errorCodes.INVALID_REFRESH_TOKEN);
    }

    const session = await this.sessionRepository.findByIdForRefresh(sessionId, identityId, appScope);
    if (session == null) {
      this.logger.warn(`ConsumerAuth: no auth session for refresh`);
      throw new BadRequestException(errorCodes.NO_IDENTITY_RECORD);
    }

    const refreshTokenHash = this.hashToken(refreshToken);
    if (!secureCompare(session.refreshTokenHash, refreshTokenHash)) {
      if (session.replacedById || session.revokedAt) {
        await this.sessionRepository.revokeSessionFamily(session.sessionFamilyId, `refresh_reuse_detected`);
        const reusedConsumer = await this.consumerIdentityRepository.findAnyById(identityId);
        await this.authAudit.recordAudit({
          identityType: AUTH_IDENTITY_TYPES.consumer,
          identityId,
          email: reusedConsumer?.email ?? `unknown`,
          event: AUTH_AUDIT_EVENTS.refresh_reuse,
          ipAddress: ctx?.ipAddress,
          userAgent: ctx?.userAgent,
        });
      } else {
        const maybeConsumer = await this.consumerIdentityRepository.findAnyById(identityId);
        await this.authAudit.recordAudit({
          identityType: AUTH_IDENTITY_TYPES.consumer,
          identityId,
          email: maybeConsumer?.email ?? `unknown`,
          event: AUTH_AUDIT_EVENTS.refresh_failure,
          ipAddress: ctx?.ipAddress,
          userAgent: ctx?.userAgent,
        });
      }
      this.logger.warn(`ConsumerAuth: refresh token mismatch`);
      throw new UnauthorizedException(errorCodes.INVALID_REFRESH_TOKEN);
    }
    if (session.revokedAt || session.expiresAt < new Date()) {
      this.logger.warn(`ConsumerAuth: refresh token is revoked or expired`);
      throw new UnauthorizedException(errorCodes.INVALID_REFRESH_TOKEN);
    }

    const consumer = await this.consumerIdentityRepository.findActiveById(identityId);
    if (!consumer) {
      this.logger.warn(`ConsumerAuth: consumer not found for identity`);
      throw new BadRequestException(errorCodes.NO_IDENTITY_RECORD);
    }
    this.ensureConsumerNotSuspended(consumer);

    const nextSessionId = randomUUID();
    const rotatedAt = new Date();
    const issued = await this.issueSessionTokens(consumer.id, appScope, nextSessionId, session.sessionFamilyId);
    let access: {
      accessToken: string;
      refreshToken: string;
      sessionId: string;
      sessionFamilyId: string;
    };
    try {
      access = await this.transactions.runAuthSessionRotation(async (tx) => {
        await this.sessionRepository.createPendingSession(
          {
            sessionId: nextSessionId,
            consumerId: consumer.id,
            appScope,
            sessionFamilyId: session.sessionFamilyId,
            refreshTokenHash: this.buildPendingRefreshTokenHash(),
            expiresAt: this.buildSessionExpiryDate(rotatedAt),
          },
          tx,
        );
        const rotation = await this.sessionRepository.markSessionRotated(tx, {
          previousSessionId: session.id,
          consumerId: consumer.id,
          appScope,
          expectedRefreshTokenHash: session.refreshTokenHash,
          replacedById: nextSessionId,
          now: rotatedAt,
        });
        if (rotation.count !== 1) {
          throw new ConsumerAuthSessionRotationConflictError();
        }
        await this.sessionRepository.finalizeIssuedSession(
          {
            sessionId: nextSessionId,
            sessionFamilyId: session.sessionFamilyId,
            accessTokenHash: issued.accessTokenHash,
            refreshTokenHash: issued.refreshTokenHash,
            finalizedAt: rotatedAt,
          },
          tx,
        );

        return {
          accessToken: issued.accessToken,
          refreshToken: issued.refreshToken,
          sessionId: nextSessionId,
          sessionFamilyId: session.sessionFamilyId,
        };
      });
    } catch (error) {
      if (!(error instanceof ConsumerAuthSessionRotationConflictError)) {
        throw error;
      }
      await this.sessionRepository.revokeSessionFamily(session.sessionFamilyId, `refresh_reuse_detected`);
      await this.authAudit.recordAudit({
        identityType: AUTH_IDENTITY_TYPES.consumer,
        identityId: consumer.id,
        email: consumer.email,
        event: AUTH_AUDIT_EVENTS.refresh_reuse,
        ipAddress: ctx?.ipAddress,
        userAgent: ctx?.userAgent,
      });
      throw new UnauthorizedException(errorCodes.INVALID_REFRESH_TOKEN);
    }

    await this.authAudit.recordAudit({
      identityType: AUTH_IDENTITY_TYPES.consumer,
      identityId: consumer.id,
      email: consumer.email,
      event: AUTH_AUDIT_EVENTS.refresh_success,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });
    return Object.assign(consumer, access);
  }

  async revokeSessionByRefreshToken(refreshToken?: string | null, appScope?: ConsumerAppScope) {
    if (!refreshToken) return;
    try {
      const verified = this.jwtService.verify<IJwtTokenPayload>(refreshToken, { secret: envs.JWT_REFRESH_SECRET });
      const identityId = this.resolveIdentityId(verified);
      const tokenAppScope = this.originResolver.validateConsumerAppScope(verified.appScope);
      if (!identityId || !verified.sid || !tokenAppScope || (appScope && tokenAppScope !== appScope)) return;
      await this.sessionRepository.revokeScopedSessionByRefreshToken({
        sessionId: verified.sid,
        consumerId: identityId,
        appScope: tokenAppScope,
        refreshTokenHash: this.hashToken(refreshToken),
      });
    } catch {
      // Ignore invalid or already-unusable refresh tokens during logout cleanup.
    }
  }

  async revokeSessionByRefreshTokenAndAudit(
    refreshToken?: string | null,
    appScope?: ConsumerAppScope,
    ctx?: LoginContext,
  ): Promise<void> {
    if (!refreshToken) return;
    try {
      const verified = this.jwtService.verify<IJwtTokenPayload>(refreshToken, { secret: envs.JWT_REFRESH_SECRET });
      const identityId = this.resolveIdentityId(verified);
      const consumer = identityId ? await this.consumerIdentityRepository.findActiveById(identityId) : null;
      await this.revokeSessionByRefreshToken(refreshToken, appScope);
      if (consumer) {
        await this.authAudit.recordAudit({
          identityType: AUTH_IDENTITY_TYPES.consumer,
          identityId: consumer.id,
          email: consumer.email,
          event: AUTH_AUDIT_EVENTS.logout,
          ipAddress: ctx?.ipAddress,
          userAgent: ctx?.userAgent,
        });
      }
    } catch {
      await this.revokeSessionByRefreshToken(refreshToken, appScope);
    }
  }

  async issueTokensForConsumer(identityId: ConsumerModel[`id`], appScope: ConsumerAppScope) {
    return this.createSessionAndIssueTokens(identityId, appScope);
  }

  async revokeAllSessionsByConsumerIdAndAudit(identityId: ConsumerModel[`id`], ctx?: LoginContext): Promise<void> {
    const consumer = await this.consumerIdentityRepository.findActiveIdentitySummaryById(identityId);
    if (!consumer) return;
    await this.sessionRepository.revokeAllByConsumerId(consumer.id, `logout_all`);
    await this.authAudit.recordAudit({
      identityType: AUTH_IDENTITY_TYPES.consumer,
      identityId: consumer.id,
      email: consumer.email,
      event: AUTH_AUDIT_EVENTS.logout_all,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });
  }

  async createSessionAndIssueTokens(
    identityId: ConsumerModel[`id`],
    appScope: ConsumerAppScope,
    sessionFamilyId?: string,
  ) {
    const sessionId = randomUUID();
    const effectiveSessionFamilyId = sessionFamilyId ?? sessionId;
    const issuedAt = new Date();
    const issued = await this.issueSessionTokens(identityId, appScope, sessionId, effectiveSessionFamilyId);

    await this.transactions.run(async (tx) => {
      await this.sessionRepository.createPendingSession(
        {
          sessionId,
          consumerId: identityId,
          appScope,
          sessionFamilyId: effectiveSessionFamilyId,
          refreshTokenHash: this.buildPendingRefreshTokenHash(),
          expiresAt: this.buildSessionExpiryDate(issuedAt),
        },
        tx,
      );
      await this.sessionRepository.finalizeIssuedSession(
        {
          sessionId,
          sessionFamilyId: effectiveSessionFamilyId,
          accessTokenHash: issued.accessTokenHash,
          refreshTokenHash: issued.refreshTokenHash,
          finalizedAt: issuedAt,
        },
        tx,
      );
    });

    return {
      accessToken: issued.accessToken,
      refreshToken: issued.refreshToken,
      sessionId,
      sessionFamilyId: effectiveSessionFamilyId,
    };
  }

  private getAccessToken(identityId: string, appScope: ConsumerAppScope, sessionId: string) {
    return this.jwtService.signAsync(
      {
        sub: identityId,
        identityId,
        sid: sessionId,
        typ: `access` as const,
        scope: `consumer` as const,
        appScope,
        role: ConsumerAuthSessionService.accessRole,
        permissions: ConsumerAuthSessionService.accessPermissions,
      },
      { expiresIn: envs.JWT_ACCESS_TTL_SECONDS },
    );
  }

  private getRefreshToken(identityId: string, appScope: ConsumerAppScope, sessionId: string, sessionFamilyId: string) {
    return this.jwtService.signAsync(
      {
        sub: identityId,
        identityId,
        sid: sessionId,
        fid: sessionFamilyId,
        typ: `refresh`,
        scope: `consumer`,
        appScope,
      },
      { expiresIn: envs.JWT_REFRESH_TTL_SECONDS, secret: envs.JWT_REFRESH_SECRET },
    );
  }

  private resolveIdentityId(payload: IJwtTokenPayload): string | null {
    return payload.identityId ?? payload.sub ?? null;
  }

  private isRefreshPayload(payload: IJwtTokenPayload): boolean {
    return payload.typ === `refresh` || (payload as { type?: string }).type === `refresh`;
  }

  private hashToken(token: string): string {
    return oauthCrypto.hashOAuthState(token);
  }

  private buildPendingRefreshTokenHash(): string {
    return `pending:${oauthCrypto.generateOAuthState()}`;
  }

  private buildSessionExpiryDate(now: Date = new Date()): Date {
    return new Date(now.getTime() + envs.JWT_REFRESH_TTL_SECONDS * 1000);
  }

  private async issueSessionTokens(
    identityId: string,
    appScope: ConsumerAppScope,
    sessionId: string,
    sessionFamilyId: string,
  ) {
    const accessToken = await this.getAccessToken(identityId, appScope, sessionId);
    const refreshToken = await this.getRefreshToken(identityId, appScope, sessionId, sessionFamilyId);

    return {
      accessToken,
      refreshToken,
      accessTokenHash: this.hashToken(accessToken),
      refreshTokenHash: this.hashToken(refreshToken),
    };
  }

  private ensureConsumerNotSuspended(consumer: Pick<ConsumerModel, `suspendedAt`>) {
    if (consumer.suspendedAt != null) {
      throw new UnauthorizedException(errorCodes.ACCOUNT_SUSPENDED);
    }
  }
}
