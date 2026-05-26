import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { type AdminModel } from '@remoola/database-2';
import { newUuid, oauthCrypto } from '@remoola/security-utils';
import { adminErrorCodes } from '@remoola/shared-constants';

import { ADMIN_AUTH_SESSION_REVOKE_REASONS, type AdminAuthSessionRevokeReason } from './admin-auth-session-reasons';
import { AdminAuthSessionRepository, AdminAuthSessionRotationConflictError } from './admin-auth-session.repository';
import { AdminIdentityRepository } from './admin-identity.repository';
import { type IJwtTokenPayload } from '../auth/jwt-payload.types';
import { envs } from '../envs';
import { AuthAuditService, AUTH_AUDIT_EVENTS, AUTH_IDENTITY_TYPES } from '../shared/auth-audit.service';
import { PrismaTransactionRunner } from '../shared/prisma-transaction.runner';
import { passwordUtils, secureCompare } from '../shared-common';
import { BackofficeCredentials } from './admin-auth.dto';

type AdminLoginContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
  reason?: AdminAuthSessionRevokeReason;
};

const ADMIN_AUTH_SESSION_LIST_RETENTION_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
    private readonly adminIdentityRepository: AdminIdentityRepository,
    private readonly adminAuthSessionRepository: AdminAuthSessionRepository,
    private readonly authAudit: AuthAuditService,
    private readonly transactions: PrismaTransactionRunner,
  ) {}

  async login(body: BackofficeCredentials, ctx?: AdminLoginContext) {
    const email = body.email?.trim()?.toLowerCase() ?? ``;
    await this.authAudit.checkLockoutAndRateLimit(AUTH_IDENTITY_TYPES.admin, email);

    const identity = await this.adminIdentityRepository.findActiveByEmail(email);
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
    const session = await this.adminAuthSessionRepository.findByIdForRefresh(sessionId, identityId);
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
          email: (await this.adminIdentityRepository.findAnyById(identityId))?.email ?? `unknown`,
          event: AUTH_AUDIT_EVENTS.refresh_reuse,
        });
      } else {
        await this.authAudit.recordAudit({
          identityType: AUTH_IDENTITY_TYPES.admin,
          identityId,
          email: (await this.adminIdentityRepository.findAnyById(identityId))?.email ?? `unknown`,
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

    const admin = await this.adminIdentityRepository.findActiveById(identityId);
    if (!admin) {
      this.logger.warn(`AdminAuth: admin not found for identity`);
      throw new BadRequestException(adminErrorCodes.ADMIN_NO_IDENTITY_RECORD);
    }

    let access: AdminTokenPair;
    try {
      access = await this.createSessionAndIssueTokens(
        admin.id,
        session.sessionFamilyId,
        session.id,
        session.refreshTokenHash,
      );
    } catch (error) {
      if (!(error instanceof AdminAuthSessionRotationConflictError)) {
        throw error;
      }
      await this.revokeSessionFamily(session.sessionFamilyId, ADMIN_AUTH_SESSION_REVOKE_REASONS.refresh_reuse_detected);
      await this.authAudit.recordAudit({
        identityType: AUTH_IDENTITY_TYPES.admin,
        identityId: admin.id,
        email: admin.email,
        event: AUTH_AUDIT_EVENTS.refresh_reuse,
      });
      throw new UnauthorizedException(adminErrorCodes.ADMIN_REFRESH_TOKEN_INVALID);
    }

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
    previousSessionId?: string,
    expectedRefreshTokenHash?: string,
  ): Promise<AdminTokenPair> {
    const sessionId = newUuid();
    const effectiveSessionFamilyId = sessionFamilyId ?? sessionId;
    const issuedAt = new Date();
    const accessToken = await this.getAccessToken(identityId, sessionId);
    const refreshToken = await this.getRefreshToken(identityId, sessionId, effectiveSessionFamilyId);
    const nextSession = {
      sessionId,
      adminId: identityId,
      sessionFamilyId: effectiveSessionFamilyId,
      refreshTokenHash: this.hashToken(refreshToken),
      accessTokenHash: this.hashToken(accessToken),
      expiresAt: new Date(issuedAt.getTime() + envs.JWT_REFRESH_TTL_SECONDS * 1000),
      issuedAt,
    };

    if (previousSessionId) {
      if (!expectedRefreshTokenHash) {
        throw new BadRequestException(adminErrorCodes.ADMIN_REFRESH_TOKEN_INVALID);
      }
      await this.transactions.runAuthSessionRotation(async (tx) => {
        await this.adminAuthSessionRepository.createIssuedSession(nextSession, tx);
        const rotation = await this.adminAuthSessionRepository.markSessionRotated(tx, {
          previousSessionId,
          adminId: identityId,
          expectedRefreshTokenHash,
          invalidatedReason: ADMIN_AUTH_SESSION_REVOKE_REASONS.rotated,
          nextSession,
          now: issuedAt,
        });
        if (rotation.count !== 1) {
          throw new AdminAuthSessionRotationConflictError();
        }
      });
    } else {
      await this.adminAuthSessionRepository.createIssuedSession(nextSession);
    }

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

    const admin = await this.adminIdentityRepository.findStepUpCredentialsById(adminId);
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

  async revokeSessionByRefreshTokenAndAudit(refreshToken?: string | null, ctx?: AdminLoginContext): Promise<void> {
    if (!refreshToken) return;
    try {
      const verified = this.jwtService.verify<IJwtTokenPayload>(refreshToken, { secret: envs.JWT_REFRESH_SECRET });
      const identityId = this.resolveIdentityId(verified);
      const admin = identityId ? await this.adminIdentityRepository.findActiveById(identityId) : null;
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
    const session = await this.adminAuthSessionRepository.findOwnedSessionForRevoke(adminId, sessionId);
    if (!session) {
      throw new BadRequestException(adminErrorCodes.ADMIN_NO_IDENTITY_RECORD);
    }

    if (!session.revokedAt) {
      await this.adminAuthSessionRepository.markSessionRevokedById(
        sessionId,
        ctx?.reason ?? ADMIN_AUTH_SESSION_REVOKE_REASONS.manual_revoke,
      );
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
      await this.adminAuthSessionRepository.revokeScopedSessionByRefreshToken({
        sessionId: verified.sid,
        adminId: identityId,
        refreshTokenHash: this.hashToken(refreshToken),
        reason: ADMIN_AUTH_SESSION_REVOKE_REASONS.logout,
      });
    } catch {
      // Ignore invalid or already-unusable refresh tokens during logout cleanup.
    }
  }

  private async revokeSessionFamily(sessionFamilyId: string, reason: AdminAuthSessionRevokeReason): Promise<void> {
    await this.adminAuthSessionRepository.revokeSessionFamily(sessionFamilyId, reason);
  }

  async assertSessionBelongsToAdmin(adminId: string, sessionId: string): Promise<boolean> {
    const session = await this.adminAuthSessionRepository.findOwnedSessionId(adminId, sessionId);
    return session != null;
  }

  async listSessionsForAdmin(adminId: string): Promise<AdminAuthSessionView[]> {
    const cutoff = new Date(Date.now() - ADMIN_AUTH_SESSION_LIST_RETENTION_DAYS * MS_PER_DAY);
    const rows = await this.adminAuthSessionRepository.listRecentByAdminId(adminId, cutoff);
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
