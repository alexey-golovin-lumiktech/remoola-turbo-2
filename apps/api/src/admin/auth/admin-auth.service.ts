import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { type AccessRefreshTokenModel, type AdminModel } from '@remoola/database-2';
import { adminErrorCodes } from '@remoola/shared-constants';

import { Credentials } from '../../dtos/admin';
import { IJwtTokenPayload } from '../../dtos/consumer';
import { JWT_ACCESS_TTL_SECONDS, JWT_REFRESH_TTL_SECONDS } from '../../envs';
import { AuthAuditService, AUTH_AUDIT_EVENTS, AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';
import { PrismaService } from '../../shared/prisma.service';
import { passwordUtils, secureCompare } from '../../shared-common';

export type AdminLoginContext = { ipAddress?: string | null; userAgent?: string | null };

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

    const access = await this.getAccessAndRefreshToken(identity.id);
    return { identity, ...access };
  }

  async refreshAccess(refreshToken: string) {
    let verified: IJwtTokenPayload;
    try {
      verified = this.jwtService.verify<IJwtTokenPayload>(refreshToken);
    } catch {
      this.logger.warn(`AdminAuth: refresh token verification failed`);
      throw new BadRequestException(adminErrorCodes.ADMIN_REFRESH_TOKEN_INVALID);
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

    const admin = await this.prisma.adminModel.findFirst({ where: { id: verified.identityId } });
    if (!admin) {
      this.logger.warn(`AdminAuth: admin not found for identity`);
      throw new BadRequestException(adminErrorCodes.ADMIN_NO_IDENTITY_RECORD);
    }
    const access = await this.getAccessAndRefreshToken(admin.id);
    return Object.assign({ ...access, type: admin.type, email: admin.email, id: admin.id });
  }

  private async getAccessAndRefreshToken(identityId: AdminModel[`id`]) {
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

  private getAccessToken(identityId: string) {
    return this.jwtService.signAsync({ identityId, type: `access` }, { expiresIn: JWT_ACCESS_TTL_SECONDS });
  }

  private getRefreshToken(identityId: string) {
    return this.jwtService.signAsync({ identityId, type: `refresh` }, { expiresIn: JWT_REFRESH_TTL_SECONDS });
  }

  async revokeSessionByRefreshTokenAndAudit(refreshToken?: string | null, ctx?: AdminLoginContext): Promise<void> {
    if (!refreshToken) return;
    try {
      const verified = this.jwtService.verify<IJwtTokenPayload>(refreshToken);
      const admin = await this.prisma.adminModel.findFirst({
        where: { id: verified.identityId, deletedAt: null },
      });
      await this.prisma.accessRefreshTokenModel.deleteMany({
        where: { identityId: verified.identityId, refreshToken },
      });
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
      try {
        await this.prisma.accessRefreshTokenModel.deleteMany({
          where: { refreshToken },
        });
      } catch {
        // ignore
      }
    }
  }
}
