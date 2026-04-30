import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Expose } from 'class-transformer';
import { IsEmail, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import express from 'express';

import { AdminAuthControllerSupportService } from '../../admin-auth/admin-auth-controller-support.service';
import { AdminAuthService } from '../../admin-auth/admin-auth.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, type IIdentityContext, PublicEndpoint } from '../../common';
import { BACKOFFICE } from '../../dtos';
import { BackofficeCredentials } from '../../dtos/backoffice';
import { TransformResponse } from '../../interceptors';
import { ADMIN_ACTION_AUDIT_ACTIONS, AdminActionAuditService } from '../../shared/admin-action-audit.service';
import { constants } from '../../shared-common';
import { AdminV2AdminsService } from '../admins/admin-v2-admins.service';

class RevokeAdminSessionBody {
  @Expose()
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}

class AcceptAdminInvitationBody {
  @Expose()
  @IsString()
  token!: string;

  @Expose()
  @IsString()
  @Matches(constants.PASSWORD_RE, { message: constants.INVALID_PASSWORD })
  password!: string;
}

class ResetAdminV2PasswordBody {
  @Expose()
  @IsString()
  token!: string;

  @Expose()
  @IsString()
  @Matches(constants.PASSWORD_RE, { message: constants.INVALID_PASSWORD })
  password!: string;
}

class RequestAdminV2PasswordResetBody {
  @Expose()
  @IsString()
  @IsEmail()
  email!: string;
}

@ApiTags(`Admin v2: Auth`)
@Controller(`admin-v2/auth`)
export class AdminV2AuthController {
  constructor(
    private readonly service: AdminAuthService,
    private readonly supportService: AdminAuthControllerSupportService,
    private readonly adminsService: AdminV2AdminsService,
    private readonly adminActionAudit: AdminActionAuditService,
  ) {}

  @PublicEndpoint()
  @Post(`invitations/accept`)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async acceptInvitation(@Body() body: AcceptAdminInvitationBody) {
    return this.adminsService.acceptInvitation(body);
  }

  @PublicEndpoint()
  @Post(`forgot-password`)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() body: RequestAdminV2PasswordResetBody) {
    await this.adminsService.requestPasswordReset(body);
    return {
      message: `If an active admin account exists, we sent recovery instructions.`,
      recoveryMode: `generic`,
    };
  }

  @PublicEndpoint()
  @Post(`password/reset`)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetAdminV2PasswordBody) {
    return this.adminsService.resetPasswordWithToken(body);
  }

  @PublicEndpoint()
  @Post(`login`)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ operationId: `admin_v2_auth_login` })
  @ApiOkResponse({ type: BACKOFFICE.BackofficeAccess })
  @TransformResponse(BACKOFFICE.BackofficeAccess)
  async login(@Req() req: express.Request, @Res({ passthrough: true }) res, @Body() body: BackofficeCredentials) {
    this.supportService.resolveAdminOrigin(req);
    const { ipAddress, userAgent } = this.supportService.resolveRequestMeta(req);
    const data = await this.service.login(body, {
      ipAddress,
      userAgent,
    });
    this.supportService.setAuthCookies(res, data.accessToken, data.refreshToken);
    return { ok: true as const };
  }

  @PublicEndpoint()
  @Post(`refresh-access`)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiCookieAuth()
  @ApiOperation({ operationId: `admin_v2_refresh_access` })
  @ApiOkResponse({ type: BACKOFFICE.BackofficeAccess })
  @TransformResponse(BACKOFFICE.BackofficeAccess)
  async refreshAccess(@Req() req: express.Request, @Res({ passthrough: true }) res: express.Response) {
    this.supportService.ensureCsrf(req);
    const refreshToken = this.supportService.getRefreshTokenFromRequest(req);
    const data = await this.service.refreshAccess(refreshToken);
    this.supportService.setAuthCookies(res, data.accessToken, data.refreshToken);
    return { ok: true as const };
  }

  @Post(`logout`)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiCookieAuth()
  async logout(@Req() req: express.Request, @Res({ passthrough: true }) res: express.Response) {
    this.supportService.ensureCsrf(req);
    await this.service.revokeSessionByRefreshTokenAndAudit(this.supportService.getRefreshTokenFromRequest(req), {
      ...this.supportService.resolveRequestMeta(req),
    });
    this.supportService.clearAuthCookies(res);
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
    @Body() body: RevokeAdminSessionBody,
  ) {
    this.supportService.ensureCsrf(req);
    const targetSessionId = body.sessionId ?? identity.sessionId;
    if (!targetSessionId) {
      throw new UnauthorizedException(`Missing session identifier`);
    }
    if (body.sessionId && body.sessionId !== identity.sessionId) {
      const owned = await this.service.assertSessionBelongsToAdmin(identity.id, body.sessionId);
      if (!owned) {
        throw new ForbiddenException(`Session does not belong to current admin`);
      }
    }
    const { ipAddress, userAgent } = this.supportService.resolveRequestMeta(req);
    const result = await this.service.revokeSessionByIdAndAudit(identity.id, targetSessionId, {
      ipAddress,
      userAgent,
    });
    await this.adminActionAudit.record({
      adminId: identity.id,
      action: ADMIN_ACTION_AUDIT_ACTIONS.admin_session_revoke,
      resource: `admin_auth_session`,
      resourceId: targetSessionId,
      metadata: {
        isOwnSession: targetSessionId === identity.sessionId,
        alreadyRevoked: result.alreadyRevoked,
      },
      ipAddress,
      userAgent,
    });
    if (targetSessionId === identity.sessionId) {
      this.supportService.clearAuthCookies(res);
    }
    return { ok: true as const, ...result };
  }

  @UseGuards(JwtAuthGuard)
  @Get(`me`)
  @ApiCookieAuth()
  async me(@Identity() identity: IIdentityContext) {
    return identity;
  }

  @UseGuards(JwtAuthGuard)
  @Get(`me/sessions`)
  @ApiCookieAuth()
  async listMySessions(@Identity() identity: IIdentityContext) {
    const sessions = await this.service.listSessionsForAdmin(identity.id);
    return {
      sessions: sessions.map((s) => ({
        ...s,
        current: s.id === identity.sessionId,
      })),
    };
  }
}
