import { randomUUID } from 'crypto';

import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { Prisma, type AccessRefreshTokenModel, type AdminModel } from '@remoola/database-2';
import { oauthCrypto } from '@remoola/security-utils';
import { adminErrorCodes } from '@remoola/shared-constants';

import { Credentials } from '../../dtos/admin';
import { IJwtTokenPayload } from '../../dtos/consumer';
import { envs } from '../../envs';
import { AuthAuditService, AUTH_AUDIT_EVENTS, AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';
import { PrismaService } from '../../shared/prisma.service';
import { passwordUtils, secureCompare } from '../../shared-common';

export type AdminLoginContext = { ipAddress?: string | null; userAgent?: string | null };
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
  ) {}

  async login(body: Credentials, ctx?: AdminLoginContext) {
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
    if (identityId && sessionId && this.isRefreshPayload(verified)) {
      return this.refreshSessionBasedAccess(refreshToken, identityId, sessionId);
    }

    const exist = await this.prisma.accessRefreshTokenModel.findFirst({ where: { identityId: verified.identityId } });
    if (exist == null) {
      this.logger.warn(`AdminAuth: no identity record for refresh`);
      throw new BadRequestException(adminErrorCodes.ADMIN_NO_IDENTITY_RECORD);
    }
    if (!secureCompare(exist.refreshToken, refreshToken)) {
      this.logger.warn(`AdminAuth: refresh token mismatch`);
      throw new BadRequestException(adminErrorCodes.ADMIN_REFRESH_TOKEN_INVALID);
    }

    const admin = await this.prisma.adminModel.findFirst({ where: { id: verified.identityId, deletedAt: null } });
    if (!admin) {
      this.logger.warn(`AdminAuth: admin not found for identity`);
      throw new BadRequestException(adminErrorCodes.ADMIN_NO_IDENTITY_RECORD);
    }
    const access = await this.getLegacyAccessAndRefreshToken(admin.id);
    return {
      accessToken: access.accessToken,
      refreshToken: access.refreshToken,
      type: admin.type,
      email: admin.email,
      id: admin.id,
    };
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
        await this.revokeSessionFamily(session.sessionFamilyId, `refresh_reuse_detected`);
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
          invalidatedReason: `rotated`,
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

  private async getLegacyAccessAndRefreshToken(identityId: AdminModel[`id`]) {
    const accessToken = await this.getAccessToken(identityId);
    const refreshToken = await this.getRefreshToken(identityId);

    const data = { accessToken, refreshToken, identityId };

    const found = await this.prisma.accessRefreshTokenModel.findFirst({ where: { identityId } });
    let saved: AccessRefreshTokenModel;
    if (found) {
      saved = await this.prisma.accessRefreshTokenModel.upsert({
        where: { id: found.id },
        update: data,
        create: data,
      });
    } else saved = await this.prisma.accessRefreshTokenModel.create({ data });

    return { accessToken: saved.accessToken, refreshToken: saved.refreshToken };
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

  /**
   * Step-up / re-auth: verify the current admin's password for critical actions
   * (refund, chargeback, admin delete, password reset).
   * Throws if passwordConfirmation is missing or does not match stored credentials.
   */
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
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

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

    // The prerequisite slice only lands the reset artifact foundation.
    // The verify/reset contract for admin-v2 is not implemented yet, so we must
    // not dispatch an email that points to a non-existent route.
    this.logger.warn({
      event: `admin_auth_password_reset_email_deferred`,
      adminId: admin.id,
      appScope: `admin-v2`,
      reason: `verify_contract_missing`,
    });

    return {
      adminId: admin.id,
      expiresAt: expiresAt.toISOString(),
      emailDispatched: false as const,
      deliveryStatus: `verify_contract_missing` as const,
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
        data: { revokedAt: new Date(), invalidatedReason: `manual_revoke`, lastUsedAt: new Date() },
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
      if (identityId && verified.sid && this.isRefreshPayload(verified)) {
        await this.prisma.adminAuthSessionModel.updateMany({
          where: {
            id: verified.sid,
            adminId: identityId,
            refreshTokenHash: this.hashToken(refreshToken),
            revokedAt: null,
          },
          data: { revokedAt: new Date(), invalidatedReason: `logout`, lastUsedAt: new Date() },
        });
        return;
      }
      await this.prisma.accessRefreshTokenModel.deleteMany({
        where: { identityId: identityId ?? verified.identityId, refreshToken },
      });
    } catch {
      try {
        await this.prisma.accessRefreshTokenModel.deleteMany({
          where: { refreshToken },
        });
      } catch {
        // ignore
      }
    }
  }

  private async revokeSessionFamily(sessionFamilyId: string, reason: string): Promise<void> {
    await this.prisma.adminAuthSessionModel.updateMany({
      where: { sessionFamilyId, revokedAt: null },
      data: { revokedAt: new Date(), invalidatedReason: reason, lastUsedAt: new Date() },
    });
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
