import { randomUUID } from 'crypto';

import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { Prisma, type AdminModel } from '@remoola/database-2';
import { oauthCrypto } from '@remoola/security-utils';
import { adminErrorCodes } from '@remoola/shared-constants';

import { ADMIN_AUTH_SESSION_REVOKE_REASONS, type AdminAuthSessionRevokeReason } from './admin-auth-session-reasons';
import { BackofficeCredentials } from '../dtos/backoffice';
import { type IJwtTokenPayload } from '../dtos/consumer';
import { envs } from '../envs';
import { AuthAuditService, AUTH_AUDIT_EVENTS, AUTH_IDENTITY_TYPES } from '../shared/auth-audit.service';
import { MailingService } from '../shared/mailing.service';
import { OriginResolverService } from '../shared/origin-resolver.service';
import { PrismaService } from '../shared/prisma.service';
import { passwordUtils, secureCompare } from '../shared-common';

type AdminLoginContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
  reason?: AdminAuthSessionRevokeReason;
};

const ADMIN_AUTH_SESSION_LIST_RETENTION_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000;

export type AdminAuthSessionView = {
  id: string;
  sessionFamilyId: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  invalidatedReason: AdminAuthSessionRevokeReason | null;
  replacedById: string | null;
};
type AdminTokenPair = {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  sessionFamilyId: string;
};

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly authAudit: AuthAuditService,
    private readonly mailingService: MailingService,
    private readonly originResolver: OriginResolverService,
  ) {}

  async login(body: BackofficeCredentials, ctx?: AdminLoginContext) {
    const email = body.email?.trim()?.toLowerCase() ?? ``;
    await this.authAudit.checkLockoutAndRateLimit(AUTH_IDENTITY_TYPES.admin, email);

    const identity = await this.prisma.adminModel.findFirst({
      where: { email, deletedAt: null },
    });
    if (!identity) throw new UnauthorizedException(adminErrorCodes.ADMIN_INVALID_CREDENTIALS);

    const valid = await passwordUtils.verifyPassword({
      password: body.password,
      storedHash: identity.password,
      storedSalt: identity.salt,
    });

    if (!valid) {
      await this.authAudit.recordAudit({
        identityType: AUTH_IDENTITY_TYPES.admin,
        identityId: identity.id,
        email: identity.email,
        event: AUTH_AUDIT_EVENTS.login_failure,
        ipAddress: ctx?.ipAddress,
        userAgent: ctx?.userAgent,
      });
      await this.authAudit.recordFailedAttempt(AUTH_IDENTITY_TYPES.admin, identity.email);
      throw new UnauthorizedException(adminErrorCodes.ADMIN_INVALID_CREDENTIALS);
    }

    await this.authAudit.recordAudit({
      identityType: AUTH_IDENTITY_TYPES.admin,
      identityId: identity.id,
      email: identity.email,
      event: AUTH_AUDIT_EVENTS.login_success,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });
    await this.authAudit.clearLockout(AUTH_IDENTITY_TYPES.admin, identity.email);

    const access = await this.createSessionAndIssueTokens(identity.id);
    return {
      identity,
      accessToken: access.accessToken,
      refreshToken: access.refreshToken,
      sessionId: access.sessionId,
      sessionFamilyId: access.sessionFamilyId,
    };
  }

  async refreshAccess(refreshToken?: string | null) {
    if (!refreshToken) {
      throw new BadRequestException(adminErrorCodes.ADMIN_REFRESH_TOKEN_INVALID);
    }
    let verified: IJwtTokenPayload;
    try {
      verified = this.jwtService.verify<IJwtTokenPayload>(refreshToken, { secret: envs.JWT_REFRESH_SECRET });
    } catch {
      this.logger.warn(`AdminAuth: refresh token verification failed`);
      throw new BadRequestException(adminErrorCodes.ADMIN_REFRESH_TOKEN_INVALID);
    }

    const identityId = this.resolveIdentityId(verified);
    const sessionId = verified.sid;
    if (!identityId || !sessionId || !this.isRefreshPayload(verified)) {
      this.logger.warn(`AdminAuth: refresh token missing sid/identityId or wrong typ`);
      throw new BadRequestException(adminErrorCodes.ADMIN_REFRESH_TOKEN_INVALID);
    }
    return this.refreshSessionBasedAccess(refreshToken, identityId, sessionId);
  }

  private async refreshSessionBasedAccess(refreshToken: string, identityId: string, sessionId: string) {
    const session = await this.prisma.adminAuthSessionModel.findFirst({
      where: { id: sessionId, adminId: identityId },
    });
    if (session == null) {
      this.logger.warn(`AdminAuth: no admin auth session for refresh`);
      throw new BadRequestException(adminErrorCodes.ADMIN_NO_IDENTITY_RECORD);
    }

    const refreshTokenHash = this.hashToken(refreshToken);
    const matchesStoredHash = secureCompare(session.refreshTokenHash, refreshTokenHash);
    if (!matchesStoredHash) {
      if (session.replacedById || session.revokedAt) {
        await this.revokeSessionFamily(
          session.sessionFamilyId,
          ADMIN_AUTH_SESSION_REVOKE_REASONS.refresh_reuse_detected,
        );
        await this.authAudit.recordAudit({
          identityType: AUTH_IDENTITY_TYPES.admin,
          identityId,
          email: (await this.prisma.adminModel.findFirst({ where: { id: identityId } }))?.email ?? `unknown`,
          event: AUTH_AUDIT_EVENTS.refresh_reuse,
        });
      } else {
        await this.authAudit.recordAudit({
          identityType: AUTH_IDENTITY_TYPES.admin,
          identityId,
          email: (await this.prisma.adminModel.findFirst({ where: { id: identityId } }))?.email ?? `unknown`,
          event: AUTH_AUDIT_EVENTS.refresh_failure,
        });
      }
      this.logger.warn(`AdminAuth: refresh token mismatch`);
      throw new UnauthorizedException(adminErrorCodes.ADMIN_REFRESH_TOKEN_INVALID);
    }
    if (session.revokedAt || session.expiresAt < new Date()) {
      this.logger.warn(`AdminAuth: refresh token is revoked or expired`);
      throw new UnauthorizedException(adminErrorCodes.ADMIN_REFRESH_TOKEN_INVALID);
    }

    const admin = await this.prisma.adminModel.findFirst({ where: { id: identityId, deletedAt: null } });
    if (!admin) {
      this.logger.warn(`AdminAuth: admin not found for identity`);
      throw new BadRequestException(adminErrorCodes.ADMIN_NO_IDENTITY_RECORD);
    }

    const access = await this.prisma.$transaction(async (tx) => {
      const next = await this.createSessionAndIssueTokens(admin.id, session.sessionFamilyId, tx);
      await tx.adminAuthSessionModel.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
          replacedById: next.sessionId,
          invalidatedReason: ADMIN_AUTH_SESSION_REVOKE_REASONS.rotated,
          lastUsedAt: new Date(),
        },
      });
      return next;
    });

    await this.authAudit.recordAudit({
      identityType: AUTH_IDENTITY_TYPES.admin,
      identityId: admin.id,
      email: admin.email,
      event: AUTH_AUDIT_EVENTS.refresh_success,
    });

    return {
      accessToken: access.accessToken,
      refreshToken: access.refreshToken,
      type: admin.type,
      email: admin.email,
      id: admin.id,
      sessionId: access.sessionId,
      sessionFamilyId: access.sessionFamilyId,
    };
  }

  private async createSessionAndIssueTokens(
    identityId: AdminModel[`id`],
    sessionFamilyId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AdminTokenPair> {
    const db = tx ?? this.prisma;
    const sessionId = randomUUID();
    const effectiveSessionFamilyId = sessionFamilyId ?? sessionId;
    const accessToken = await this.getAccessToken(identityId, sessionId);
    const refreshToken = await this.getRefreshToken(identityId, sessionId, effectiveSessionFamilyId);

    await db.adminAuthSessionModel.create({
      data: {
        id: sessionId,
        adminId: identityId,
        sessionFamilyId: effectiveSessionFamilyId,
        refreshTokenHash: this.hashToken(refreshToken),
        accessTokenHash: this.hashToken(accessToken),
        expiresAt: new Date(Date.now() + envs.JWT_REFRESH_TTL_SECONDS * 1000),
        lastUsedAt: new Date(),
      },
    });

    return { accessToken, refreshToken, sessionId, sessionFamilyId: effectiveSessionFamilyId };
  }

  private getAccessToken(identityId: string, sessionId?: string) {
    return this.jwtService.signAsync(
      { sub: identityId, identityId, sid: sessionId, typ: `access`, scope: `admin` },
      { expiresIn: envs.JWT_ACCESS_TTL_SECONDS },
    );
  }

  private getRefreshToken(identityId: string, sessionId?: string, sessionFamilyId?: string) {
    return this.jwtService.signAsync(
      { sub: identityId, identityId, sid: sessionId, fid: sessionFamilyId, typ: `refresh`, scope: `admin` },
      { expiresIn: envs.JWT_REFRESH_TTL_SECONDS, secret: envs.JWT_REFRESH_SECRET },
    );
  }

  /** Re-authenticate the current admin before sensitive actions. */
  async verifyStepUp(adminId: string, passwordConfirmation: string): Promise<void> {
    const trimmed = typeof passwordConfirmation === `string` ? passwordConfirmation.trim() : ``;
    if (trimmed.length === 0) {
      throw new BadRequestException(adminErrorCodes.ADMIN_PASSWORD_CONFIRMATION_REQUIRED);
    }
    const admin = await this.prisma.adminModel.findFirst({
      where: { id: adminId, deletedAt: null },
      select: { id: true, password: true, salt: true },
    });
    if (!admin) {
      throw new UnauthorizedException(adminErrorCodes.ADMIN_PASSWORD_CONFIRMATION_INVALID);
    }
    const valid = await passwordUtils.verifyPassword({
      password: trimmed,
      storedHash: admin.password,
      storedSalt: admin.salt,
    });
    if (!valid) {
      throw new UnauthorizedException(adminErrorCodes.ADMIN_PASSWORD_CONFIRMATION_INVALID);
    }
  }

  async issueAdminPasswordReset(adminId: string) {
    const admin = await this.prisma.adminModel.findFirst({
      where: { id: adminId, deletedAt: null },
      select: { id: true, email: true },
    });
    if (!admin) {
      throw new BadRequestException(adminErrorCodes.ADMIN_NO_IDENTITY_RECORD);
    }

    const token = oauthCrypto.generateOAuthState();
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);

    await this.prisma.$transaction(async (tx) => {
      await tx.resetPasswordModel.updateMany({
        where: { adminId: admin.id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      await tx.resetPasswordModel.create({
        data: {
          adminId: admin.id,
          tokenHash,
          expiredAt: expiresAt,
          appScope: `admin-v2`,
        },
      });
    });

    const originCandidate = this.originResolver.resolveConfiguredAdminOrigin();
    if (!originCandidate) {
      throw new BadRequestException(`Admin v2 app origin is not configured`);
    }
    const resetUrl = new URL(`/reset-password`, this.originResolver.normalizeOrigin(originCandidate));
    resetUrl.searchParams.set(`token`, token);
    const emailDispatched = await this.mailingService.sendAdminV2PasswordResetEmail({
      email: admin.email,
      forgotPasswordLink: resetUrl.toString(),
    });

    return {
      adminId: admin.id,
      expiresAt: expiresAt.toISOString(),
      emailDispatched,
      deliveryStatus: emailDispatched ? (`sent` as const) : (`failed` as const),
    };
  }

  async revokeSessionByRefreshTokenAndAudit(refreshToken?: string | null, ctx?: AdminLoginContext): Promise<void> {
    if (!refreshToken) return;
    try {
      const verified = this.jwtService.verify<IJwtTokenPayload>(refreshToken, { secret: envs.JWT_REFRESH_SECRET });
      const identityId = this.resolveIdentityId(verified);
      const admin = await this.prisma.adminModel.findFirst({
        where: { id: identityId ?? verified.identityId, deletedAt: null },
      });
      await this.revokeSessionByRefreshToken(refreshToken);
      if (admin) {
        await this.authAudit.recordAudit({
          identityType: AUTH_IDENTITY_TYPES.admin,
          identityId: admin.id,
          email: admin.email,
          event: AUTH_AUDIT_EVENTS.logout,
          ipAddress: ctx?.ipAddress,
          userAgent: ctx?.userAgent,
        });
      }
    } catch {
      await this.revokeSessionByRefreshToken(refreshToken);
    }
  }

  async revokeSessionByIdAndAudit(adminId: string, sessionId: string, ctx?: AdminLoginContext) {
    const session = await this.prisma.adminAuthSessionModel.findFirst({
      where: { id: sessionId, adminId },
      select: { id: true, revokedAt: true, admin: { select: { email: true } } },
    });
    if (!session) {
      throw new BadRequestException(adminErrorCodes.ADMIN_NO_IDENTITY_RECORD);
    }
    if (!session.revokedAt) {
      await this.prisma.adminAuthSessionModel.update({
        where: { id: sessionId },
        data: {
          revokedAt: new Date(),
          invalidatedReason: ctx?.reason ?? ADMIN_AUTH_SESSION_REVOKE_REASONS.manual_revoke,
          lastUsedAt: new Date(),
        },
      });
      await this.authAudit.recordAudit({
        identityType: AUTH_IDENTITY_TYPES.admin,
        identityId: adminId,
        email: session.admin.email,
        event: AUTH_AUDIT_EVENTS.logout,
        ipAddress: ctx?.ipAddress,
        userAgent: ctx?.userAgent,
      });
    }
    return { revokedSessionId: sessionId, alreadyRevoked: session.revokedAt != null };
  }

  private async revokeSessionByRefreshToken(refreshToken?: string | null) {
    if (!refreshToken) return;
    try {
      const verified = this.jwtService.verify<IJwtTokenPayload>(refreshToken, { secret: envs.JWT_REFRESH_SECRET });
      const identityId = this.resolveIdentityId(verified);
      if (!identityId || !verified.sid || !this.isRefreshPayload(verified)) {
        return;
      }
      await this.prisma.adminAuthSessionModel.updateMany({
        where: {
          id: verified.sid,
          adminId: identityId,
          refreshTokenHash: this.hashToken(refreshToken),
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          invalidatedReason: ADMIN_AUTH_SESSION_REVOKE_REASONS.logout,
          lastUsedAt: new Date(),
        },
      });
    } catch {
      // Ignore invalid or already-unusable refresh tokens during logout cleanup.
    }
  }

  private async revokeSessionFamily(sessionFamilyId: string, reason: AdminAuthSessionRevokeReason): Promise<void> {
    await this.prisma.adminAuthSessionModel.updateMany({
      where: { sessionFamilyId, revokedAt: null },
      data: { revokedAt: new Date(), invalidatedReason: reason, lastUsedAt: new Date() },
    });
  }

  async assertSessionBelongsToAdmin(adminId: string, sessionId: string): Promise<boolean> {
    const session = await this.prisma.adminAuthSessionModel.findFirst({
      where: { id: sessionId, adminId },
      select: { id: true },
    });
    return session != null;
  }

  async listSessionsForAdmin(adminId: string): Promise<AdminAuthSessionView[]> {
    const cutoff = new Date(Date.now() - ADMIN_AUTH_SESSION_LIST_RETENTION_DAYS * MS_PER_DAY);
    const rows = await this.prisma.adminAuthSessionModel.findMany({
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
    return rows.map((row) => ({
      id: row.id,
      sessionFamilyId: row.sessionFamilyId,
      createdAt: row.createdAt.toISOString(),
      lastUsedAt: row.lastUsedAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
      invalidatedReason: (row.invalidatedReason as AdminAuthSessionRevokeReason | null) ?? null,
      replacedById: row.replacedById ?? null,
    }));
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
}
