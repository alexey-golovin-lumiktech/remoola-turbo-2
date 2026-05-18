import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import express from 'express';

import { type ConsumerAppScope } from '@remoola/api-types';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerAuthService } from './auth.service';
import { ConsumerAuthControllerSupportService } from './consumer-auth-controller-support.service';
import { LoginBody } from '../../auth/dto/login.dto';
import { Identity, type IIdentityContext, PublicEndpoint, TrackConsumerAction } from '../../common';
import { CONSUMER } from '../../dtos';
import { TransformResponse } from '../../interceptors';
import { getApiOAuthStateCookieKey } from '../../shared-common';

@ApiTags(`Consumer: Auth`)
@Controller(`consumer/auth`)
export class ConsumerSessionController {
  private readonly oauthStateTtlMs = 5 * 60 * 1000;

  constructor(
    private readonly service: ConsumerAuthService,
    private readonly supportService: ConsumerAuthControllerSupportService,
  ) {}

  private requireRequestConsumerAppScope(req: express.Request): ConsumerAppScope {
    return this.supportService.requireRequestConsumerAppScope(req);
  }

  private requireClaimedConsumerAppScope(req: express.Request, appScope?: string | null): ConsumerAppScope {
    return this.supportService.requireClaimedConsumerAppScope(req, appScope);
  }

  private getRefreshTokenFromRequest(req: express.Request, consumerScope: ConsumerAppScope): string | undefined {
    return this.supportService.getRefreshTokenFromRequest(req, consumerScope);
  }

  private setAuthCookies(
    req: express.Request,
    res: express.Response,
    accessToken: string,
    refreshToken: string,
    consumerScope: ConsumerAppScope,
  ) {
    return this.supportService.setAuthCookies(req, res, accessToken, refreshToken, consumerScope);
  }

  private clearAuthCookies(req: express.Request, res: express.Response, consumerScope: ConsumerAppScope) {
    return this.supportService.clearAuthCookies(req, res, consumerScope);
  }

  private clearGoogleSignupSessionCookie(req: express.Request, res: express.Response, consumerScope: ConsumerAppScope) {
    return this.supportService.clearGoogleSignupSessionCookie(req, res, consumerScope);
  }

  private getOAuthClearCookieOptions(req?: express.Request) {
    return this.supportService.getOAuthClearCookieOptions(req, this.oauthStateTtlMs);
  }

  private ensureCsrf(req: express.Request) {
    return this.supportService.ensureCsrf(req);
  }

  @PublicEndpoint()
  @TrackConsumerAction({ action: `consumer.auth.login`, resource: `auth` })
  @Post(`login`)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ operationId: `consumer_auth_login` })
  @ApiOkResponse({ type: CONSUMER.LoginResponse })
  @TransformResponse(CONSUMER.LoginResponse)
  async login(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res,
    @Body() body: LoginBody,
    @Query(`appScope`) appScope?: string,
  ) {
    const consumerScope = this.requireClaimedConsumerAppScope(req, appScope);
    const ipAddress = req.ip ?? req.headers[`x-forwarded-for`] ?? null;
    const userAgent = req.headers[`user-agent`] ?? null;
    const data = await this.service.login(body, consumerScope, {
      ipAddress: typeof ipAddress === `string` ? ipAddress : (ipAddress?.[0] ?? null),
      userAgent: typeof userAgent === `string` ? userAgent : null,
    });
    this.setAuthCookies(req, res, data.accessToken, data.refreshToken, consumerScope);
    return { ok: true as const };
  }

  @PublicEndpoint()
  @Post(`logout`)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  async logout(@Req() req: express.Request, @Res({ passthrough: true }) res) {
    this.ensureCsrf(req);
    const consumerScope = this.requireRequestConsumerAppScope(req);
    const ipAddress = req.ip ?? req.headers[`x-forwarded-for`] ?? null;
    const userAgent = req.headers[`user-agent`] ?? null;
    await this.service.revokeSessionByRefreshTokenAndAudit(
      this.getRefreshTokenFromRequest(req, consumerScope),
      consumerScope,
      {
        ipAddress: typeof ipAddress === `string` ? ipAddress : Array.isArray(ipAddress) ? ipAddress[0] : null,
        userAgent: typeof userAgent === `string` ? userAgent : null,
      },
    );
    this.clearAuthCookies(req, res, consumerScope);
    this.clearGoogleSignupSessionCookie(req, res, consumerScope);
    res.clearCookie(getApiOAuthStateCookieKey(req, consumerScope), this.getOAuthClearCookieOptions(req));
    return { ok: true };
  }

  @PublicEndpoint()
  @Post(`refresh`)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiCookieAuth()
  @ApiOperation({ operationId: `refresh_access` })
  @ApiOkResponse({ type: CONSUMER.LoginResponse })
  async refreshAccess(@Req() req: express.Request, @Res({ passthrough: true }) res) {
    this.ensureCsrf(req);
    const consumerScope = this.requireRequestConsumerAppScope(req);
    const ipAddress = req.ip ?? req.headers[`x-forwarded-for`] ?? null;
    const userAgent = req.headers[`user-agent`] ?? null;
    const refreshToken = this.getRefreshTokenFromRequest(req, consumerScope);
    if (!refreshToken) throw new UnauthorizedException(errorCodes.INVALID_REFRESH_TOKEN);
    const data = await this.service.refreshAccess(refreshToken, consumerScope, {
      ipAddress: typeof ipAddress === `string` ? ipAddress : (ipAddress?.[0] ?? null),
      userAgent: typeof userAgent === `string` ? userAgent : null,
    });
    this.setAuthCookies(req, res, data.accessToken, data.refreshToken, consumerScope);
    return { ok: true as const };
  }

  @Post(`logout-all`)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  async logoutAll(
    @Req() req: express.Request,
    @Identity() identity: IIdentityContext,
    @Res({ passthrough: true }) res,
  ) {
    this.ensureCsrf(req);
    const consumerScope = this.requireRequestConsumerAppScope(req);
    const ipAddress = req.ip ?? req.headers[`x-forwarded-for`] ?? null;
    const userAgent = req.headers[`user-agent`] ?? null;
    await this.service.revokeAllSessionsByConsumerIdAndAudit(identity.id, {
      ipAddress: typeof ipAddress === `string` ? ipAddress : Array.isArray(ipAddress) ? ipAddress[0] : null,
      userAgent: typeof userAgent === `string` ? userAgent : null,
    });
    this.clearAuthCookies(req, res, consumerScope);
    this.clearGoogleSignupSessionCookie(req, res, consumerScope);
    res.clearCookie(getApiOAuthStateCookieKey(req, consumerScope), this.getOAuthClearCookieOptions(req));
    return { ok: true };
  }

  @TrackConsumerAction({ action: `consumer.auth.me`, resource: `auth` })
  @Get(`me`)
  @ApiCookieAuth()
  me(@Identity() identity: IIdentityContext) {
    return identity;
  }
}
