import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { type ConsumerAppScope } from '@remoola/api-types';
import { type Prisma, type ConsumerModel } from '@remoola/database-2';
import { oauthCrypto } from '@remoola/security-utils';
import { errorCodes } from '@remoola/shared-constants';

import { type IJwtTokenPayload } from '../../dtos/consumer';
import { envs } from '../../envs';
import { AuthAuditService, AUTH_AUDIT_EVENTS, AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { PrismaService } from '../../shared/prisma.service';
import { secureCompare } from '../../shared-common';

type LoginContext = { ipAddress?: string | null; userAgent?: string | null };

@Injectable()
export class ConsumerAuthSessionService {
  private readonly logger = new Logger(ConsumerAuthSessionService.name);
  private static readonly accessRole = `USER` as const;
  private static readonly accessPermissions = [`contacts.read`] as const;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly authAudit: AuthAuditService,
    private readonly originResolver: OriginResolverService,
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

    const session = await this.prisma.authSessionModel.findFirst({
      where: { id: sessionId, consumerId: identityId, appScope },
    });
    if (session == null) {
      this.logger.warn(`ConsumerAuth: no auth session for refresh`);
      throw new BadRequestException(errorCodes.NO_IDENTITY_RECORD);
    }

    const refreshTokenHash = this.hashToken(refreshToken);
    if (!secureCompare(session.refreshTokenHash, refreshTokenHash)) {
      if (session.replacedById || session.revokedAt) {
        await this.revokeSessionFamily(session.sessionFamilyId, `refresh_reuse_detected`);
        const reusedConsumer = await this.prisma.consumerModel.findFirst({ where: { id: identityId } });
        await this.authAudit.recordAudit({
          identityType: AUTH_IDENTITY_TYPES.consumer,
          identityId,
          email: reusedConsumer?.email ?? `unknown`,
          event: AUTH_AUDIT_EVENTS.refresh_reuse,
          ipAddress: ctx?.ipAddress,
          userAgent: ctx?.userAgent,
        });
      } else {
        const maybeConsumer = await this.prisma.consumerModel.findFirst({ where: { id: identityId } });
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

    const consumer = await this.prisma.consumerModel.findFirst({ where: { id: identityId, deletedAt: null } });
    if (!consumer) {
      this.logger.warn(`ConsumerAuth: consumer not found for identity`);
      throw new BadRequestException(errorCodes.NO_IDENTITY_RECORD);
    }
    this.ensureConsumerNotSuspended(consumer);

    const access = await this.prisma.$transaction(async (tx) => {
      const next = await this.createSessionAndIssueTokens(consumer.id, appScope, session.sessionFamilyId, tx);
      await tx.authSessionModel.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
          replacedById: next.sessionId,
          invalidatedReason: `rotated`,
          lastUsedAt: new Date(),
        },
      });
      return next;
    });

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
      await this.prisma.authSessionModel.updateMany({
        where: {
          id: verified.sid,
          consumerId: identityId,
          appScope: tokenAppScope,
          refreshTokenHash: this.hashToken(refreshToken),
          revokedAt: null,
        },
        data: { revokedAt: new Date(), invalidatedReason: `logout`, lastUsedAt: new Date() },
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
      const consumer = await this.prisma.consumerModel.findFirst({
        where: { id: verified.identityId, deletedAt: null },
      });
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
    const consumer = await this.prisma.consumerModel.findFirst({
      where: { id: identityId, deletedAt: null },
      select: { id: true, email: true },
    });
    if (!consumer) return;
    await this.prisma.authSessionModel.updateMany({
      where: { consumerId: consumer.id, revokedAt: null },
      data: { revokedAt: new Date(), invalidatedReason: `logout_all`, lastUsedAt: new Date() },
    });
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
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    const temporaryHash = `pending:${oauthCrypto.generateOAuthState()}`;
    const expiresAt = new Date(Date.now() + envs.JWT_REFRESH_TTL_SECONDS * 1000);

    const created = await db.authSessionModel.create({
      data: {
        consumerId: identityId,
        appScope,
        sessionFamilyId: sessionFamilyId ?? identityId,
        refreshTokenHash: temporaryHash,
        expiresAt,
      },
    });

    const effectiveSessionFamilyId = sessionFamilyId ?? created.id;
    const accessToken = await this.getAccessToken(identityId, appScope, created.id);
    const refreshToken = await this.getRefreshToken(identityId, appScope, created.id, effectiveSessionFamilyId);

    await db.authSessionModel.update({
      where: { id: created.id },
      data: {
        accessTokenHash: this.hashToken(accessToken),
        sessionFamilyId: effectiveSessionFamilyId,
        refreshTokenHash: this.hashToken(refreshToken),
        lastUsedAt: new Date(),
      },
    });

    return { accessToken, refreshToken, sessionId: created.id, sessionFamilyId: effectiveSessionFamilyId };
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

  private async revokeSessionFamily(sessionFamilyId: string, reason: string): Promise<void> {
    await this.prisma.authSessionModel.updateMany({
      where: { sessionFamilyId, revokedAt: null },
      data: { revokedAt: new Date(), invalidatedReason: reason, lastUsedAt: new Date() },
    });
  }

  private ensureConsumerNotSuspended(consumer: Pick<ConsumerModel, `suspendedAt`>) {
    if (consumer.suspendedAt != null) {
      throw new UnauthorizedException(errorCodes.ACCOUNT_SUSPENDED);
    }
  }
}
