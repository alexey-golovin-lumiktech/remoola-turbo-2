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
} from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import express from 'express';

import {
  adminV2ListAdminSessionsResponseSchema,
  type AdminV2AcceptAdminInvitationResponse,
  type AdminV2AuthOkResponse,
  type AdminV2ListAdminSessionsResponse,
  type AdminV2RequestPasswordResetResponse,
  type AdminV2RevokeAdminSessionResponse,
  type AdminV2ResetPasswordWithTokenResponse,
} from '@remoola/api-types';

import {
  AcceptAdminInvitationBody,
  RequestAdminV2PasswordResetBody,
  ResetAdminV2PasswordBody,
  RevokeAdminSessionBody,
} from './admin-v2-auth.dto';
import { AdminAuthControllerSupportService } from '../../admin-auth/admin-auth-controller-support.service';
import { BackofficeAccess, BackofficeCredentials } from '../../admin-auth/admin-auth.dto';
import { AdminAuthService } from '../../admin-auth/admin-auth.service';
import { Identity, type IIdentityContext, PublicEndpoint } from '../../common';
import { TransformResponse } from '../../interceptors';
import { ADMIN_ACTION_AUDIT_ACTIONS, AdminActionAuditService } from '../../shared/admin-action-audit.service';
import { toAdminV2WireContract } from '../admin-v2-wire-contract';
import { AdminV2AdminsService } from '../admins/admin-v2-admins.service';

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
  async acceptInvitation(@Body() body: AcceptAdminInvitationBody): Promise<AdminV2AcceptAdminInvitationResponse> {
    return this.adminsService.acceptInvitation(body);
  }

  @PublicEndpoint()
  @Post(`forgot-password`)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(
    @Body() body: RequestAdminV2PasswordResetBody,
  ): Promise<AdminV2RequestPasswordResetResponse> {
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
  async resetPassword(@Body() body: ResetAdminV2PasswordBody): Promise<AdminV2ResetPasswordWithTokenResponse> {
    return this.adminsService.resetPasswordWithToken(body);
  }

  @PublicEndpoint()
  @Post(`login`)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ operationId: `admin_v2_auth_login` })
  @ApiOkResponse({ type: BackofficeAccess })
  @TransformResponse(BackofficeAccess)
  async login(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res,
    @Body() body: BackofficeCredentials,
  ): Promise<AdminV2AuthOkResponse> {
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
  @ApiOkResponse({ type: BackofficeAccess })
  @TransformResponse(BackofficeAccess)
  async refreshAccess(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<AdminV2AuthOkResponse> {
    this.supportService.ensureCsrf(req);
    const refreshToken = this.supportService.getRefreshTokenFromRequest(req);
    const data = await this.service.refreshAccess(refreshToken);
    this.supportService.setAuthCookies(res, data.accessToken, data.refreshToken);
    return { ok: true as const };
  }

  @Post(`logout`)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiCookieAuth()
  async logout(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<AdminV2AuthOkResponse> {
    this.supportService.ensureCsrf(req);
    await this.service.revokeSessionByRefreshTokenAndAudit(this.supportService.getRefreshTokenFromRequest(req), {
      ...this.supportService.resolveRequestMeta(req),
    });
    this.supportService.clearAuthCookies(res);
    return { ok: true };
  }

  @Post(`revoke-session`)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiCookieAuth()
  async revokeSession(
    @Req() req: express.Request,
    @Identity() identity: IIdentityContext,
    @Res({ passthrough: true }) res: express.Response,
    @Body() body: RevokeAdminSessionBody,
  ): Promise<AdminV2RevokeAdminSessionResponse> {
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

  @Get(`me`)
  @ApiCookieAuth()
  async me(@Identity() identity: IIdentityContext) {
    return identity;
  }

  @Get(`me/sessions`)
  @ApiCookieAuth()
  async listMySessions(@Identity() identity: IIdentityContext): Promise<AdminV2ListAdminSessionsResponse> {
    const sessions = await this.service.listSessionsForAdmin(identity.id);
    return toAdminV2WireContract(adminV2ListAdminSessionsResponseSchema, {
      sessions: sessions.map((s) => ({
        ...s,
        current: s.id === identity.sessionId,
      })),
    });
  }
}
