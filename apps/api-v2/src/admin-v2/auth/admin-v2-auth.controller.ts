import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import express from 'express';

import { oauthCrypto } from '@remoola/security-utils';

import { AdminAuthService } from '../../admin/auth/admin-auth.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, type IIdentityContext, PublicEndpoint } from '../../common';
import { ADMIN } from '../../dtos';
import { Credentials } from '../../dtos/admin';
import { envs } from '../../envs';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import {
  getApiAdminAccessTokenCookieKey,
  getApiAdminAuthCookieClearOptions,
  getApiAdminAuthCookieOptions,
  getApiAdminCsrfCookieClearOptions,
  getApiAdminCsrfCookieOptions,
  getApiAdminCsrfTokenCookieKey,
  getApiAdminCsrfTokenCookieKeysForRead,
  getApiAdminRefreshTokenCookieKey,
  getApiAdminRefreshTokenCookieKeysForRead,
} from '../../shared-common';
import { AdminV2AdminsService } from '../admins/admin-v2-admins.service';

class RevokeAdminSessionBodyDTO {
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}

class AcceptAdminInvitationBodyDTO {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

class ResetAdminV2PasswordBodyDTO {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

@ApiTags(`Admin v2: Auth`)
@Controller(`admin-v2/auth`)
export class AdminV2AuthController {
  constructor(
    private readonly service: AdminAuthService,
    private readonly originResolver: OriginResolverService,
    private readonly adminsService: AdminV2AdminsService,
  ) {}

  private getRefreshTokenFromRequest(req: express.Request): string | undefined {
    return getApiAdminRefreshTokenCookieKeysForRead()
      .map((key) => req.cookies?.[key])
      .find((value): value is string => typeof value === `string` && value.length > 0);
  }

  private setAuthCookies(res: express.Response, accessToken: string, refreshToken: string) {
    const common = getApiAdminAuthCookieOptions();
    res.cookie(getApiAdminAccessTokenCookieKey(), accessToken, { ...common, maxAge: envs.JWT_ACCESS_TOKEN_EXPIRES_IN });
    res.cookie(getApiAdminRefreshTokenCookieKey(), refreshToken, {
      ...common,
      maxAge: envs.JWT_REFRESH_TOKEN_EXPIRES_IN,
    });
    res.cookie(getApiAdminCsrfTokenCookieKey(), oauthCrypto.generateOAuthState(), getApiAdminCsrfCookieOptions());
  }

  private clearAuthCookies(res: express.Response) {
    const authCookieOptions = getApiAdminAuthCookieClearOptions();
    const csrfCookieOptions = getApiAdminCsrfCookieClearOptions();
    res.clearCookie(getApiAdminAccessTokenCookieKey(), authCookieOptions);
    res.clearCookie(getApiAdminRefreshTokenCookieKey(), authCookieOptions);
    res.clearCookie(getApiAdminCsrfTokenCookieKey(), csrfCookieOptions);
  }

  private ensureCsrf(req: express.Request) {
    if (!this.originResolver.resolveAdminRequestOrigin(req.headers.origin, req.headers.referer)) {
      throw new UnauthorizedException(`Invalid request origin`);
    }
    const csrfHeader = req.headers[`x-csrf-token`];
    const csrfCookie = getApiAdminCsrfTokenCookieKeysForRead()
      .map((key) => req.cookies?.[key])
      .find((value): value is string => typeof value === `string` && value.length > 0);
    const csrfHeaderValue =
      typeof csrfHeader === `string` ? csrfHeader : Array.isArray(csrfHeader) ? csrfHeader[0] : undefined;
    if (!csrfHeaderValue || !csrfCookie || csrfCookie !== csrfHeaderValue) {
      throw new UnauthorizedException(`Invalid CSRF token`);
    }
  }

  @PublicEndpoint()
  @Post(`invitations/accept`)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async acceptInvitation(@Body() body: AcceptAdminInvitationBodyDTO) {
    return this.adminsService.acceptInvitation(body);
  }

  @PublicEndpoint()
  @Post(`password/reset`)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async resetPassword(@Body() body: ResetAdminV2PasswordBodyDTO) {
    return this.adminsService.resetPasswordWithToken(body);
  }

  @PublicEndpoint()
  @Post(`login`)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ operationId: `admin_v2_auth_login` })
  @ApiOkResponse({ type: ADMIN.Access })
  async login(@Req() req: express.Request, @Res({ passthrough: true }) res, @Body() body: Credentials) {
    const resolvedOrigin = this.originResolver.resolveAdminRequestOrigin(req.headers.origin, req.headers.referer);
    if (!resolvedOrigin) {
      throw new UnauthorizedException(`Invalid request origin`);
    }
    const ipAddress = req.ip ?? req.headers[`x-forwarded-for`];
    const userAgent = req.headers[`user-agent`] ?? null;
    const data = await this.service.login(body, {
      ipAddress: typeof ipAddress === `string` ? ipAddress : Array.isArray(ipAddress) ? ipAddress[0] : null,
      userAgent: typeof userAgent === `string` ? userAgent : null,
    });
    this.setAuthCookies(res, data.accessToken, data.refreshToken);
    return { ok: true as const };
  }

  @PublicEndpoint()
  @Post(`refresh-access`)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiCookieAuth()
  @ApiOperation({ operationId: `admin_v2_refresh_access` })
  @ApiOkResponse({ type: ADMIN.Access })
  async refreshAccess(@Req() req: express.Request, @Res({ passthrough: true }) res: express.Response) {
    this.ensureCsrf(req);
    const refreshToken = this.getRefreshTokenFromRequest(req);
    const data = await this.service.refreshAccess(refreshToken);
    this.setAuthCookies(res, data.accessToken, data.refreshToken);
    return { ok: true as const };
  }

  @Post(`logout`)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiCookieAuth()
  async logout(@Req() req: express.Request, @Res({ passthrough: true }) res: express.Response) {
    this.ensureCsrf(req);
    const ipAddress = req.ip ?? req.headers[`x-forwarded-for`];
    const userAgent = req.headers[`user-agent`] ?? null;
    await this.service.revokeSessionByRefreshTokenAndAudit(this.getRefreshTokenFromRequest(req), {
      ipAddress: typeof ipAddress === `string` ? ipAddress : Array.isArray(ipAddress) ? ipAddress[0] : null,
      userAgent: typeof userAgent === `string` ? userAgent : null,
    });
    this.clearAuthCookies(res);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post(`revoke-session`)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiCookieAuth()
  async revokeSession(
    @Req() req: express.Request,
    @Identity() identity: IIdentityContext,
    @Res({ passthrough: true }) res: express.Response,
    @Body() body: RevokeAdminSessionBodyDTO,
  ) {
    this.ensureCsrf(req);
    const targetSessionId = body.sessionId ?? identity.sessionId;
    if (!targetSessionId) {
      throw new UnauthorizedException(`Missing session identifier`);
    }
    const ipAddress = req.ip ?? req.headers[`x-forwarded-for`];
    const userAgent = req.headers[`user-agent`] ?? null;
    const result = await this.service.revokeSessionByIdAndAudit(identity.id, targetSessionId, {
      ipAddress: typeof ipAddress === `string` ? ipAddress : Array.isArray(ipAddress) ? ipAddress[0] : null,
      userAgent: typeof userAgent === `string` ? userAgent : null,
    });
    if (targetSessionId === identity.sessionId) {
      this.clearAuthCookies(res);
    }
    return { ok: true as const, ...result };
  }

  @UseGuards(JwtAuthGuard)
  @Get(`me`)
  @ApiCookieAuth()
  async me(@Identity() identity: IIdentityContext) {
    return identity;
  }
}
