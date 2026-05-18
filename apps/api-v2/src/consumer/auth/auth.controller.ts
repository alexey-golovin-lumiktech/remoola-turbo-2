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
  BadRequestException,
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import express from 'express';

import { type ConsumerAppScope } from '@remoola/api-types';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerAuthService } from './auth.service';
import { ConsumerAuthControllerSupportService } from './consumer-auth-controller-support.service';
import { OAuthStateStoreService } from './oauth-state-store.service';
import { LoginBody } from '../../auth/dto/login.dto';
import { Identity, type IIdentityContext, PublicEndpoint, TrackConsumerAction } from '../../common';
import { CONSUMER } from '../../dtos';
import { HandoffTokenRequest } from '../../dtos/consumer';
import { TransformResponse } from '../../interceptors';
import { getApiOAuthStateCookieKey } from '../../shared-common';

@ApiTags(`Consumer: Auth`)
@Controller(`consumer/auth`)
export class ConsumerAuthController {
  private readonly oauthStateTtlMs = 5 * 60 * 1000;
  private readonly googleSignupSessionTtlMs = 10 * 60 * 1000;

  constructor(
    private readonly service: ConsumerAuthService,
    private readonly oauthStateStore: OAuthStateStoreService,
    private readonly supportService: ConsumerAuthControllerSupportService,
  ) {}

  private requireRequestConsumerAppScope(req: express.Request): ConsumerAppScope {
    return this.supportService.requireRequestConsumerAppScope(req);
  }

  private requireClaimedConsumerAppScope(req: express.Request, appScope?: string | null): ConsumerAppScope {
    return this.supportService.requireClaimedConsumerAppScope(req, appScope);
  }

  private resolveConfiguredConsumerOrigin(scope: ConsumerAppScope): string {
    return this.supportService.resolveConfiguredConsumerOrigin(scope);
  }

  private getRefreshTokenFromRequest(req: express.Request, consumerScope: ConsumerAppScope): string | undefined {
    return this.supportService.getRefreshTokenFromRequest(req, consumerScope);
  }

  private getGoogleSignupSessionTokenFromRequest(
    req: express.Request,
    consumerScope: ConsumerAppScope,
  ): string | undefined {
    return this.supportService.getGoogleSignupSessionTokenFromRequest(req, consumerScope);
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

  private setGoogleSignupSessionCookie(
    req: express.Request,
    res: express.Response,
    token: string,
    consumerScope: ConsumerAppScope,
  ) {
    return this.supportService.setGoogleSignupSessionCookie(
      req,
      res,
      token,
      consumerScope,
      this.googleSignupSessionTtlMs,
    );
  }

  private clearGoogleSignupSessionCookie(req: express.Request, res: express.Response, consumerScope: ConsumerAppScope) {
    return this.supportService.clearGoogleSignupSessionCookie(req, res, consumerScope);
  }

  private getOAuthClearCookieOptions(req?: express.Request) {
    return this.supportService.getOAuthClearCookieOptions(req, this.oauthStateTtlMs);
  }

  private requireStoredConsumerAppScopeMatchesRequest(
    req: express.Request,
    storedAppScope?: string | null,
  ): ConsumerAppScope {
    return this.supportService.requireStoredConsumerAppScopeMatchesRequest(req, storedAppScope);
  }

  private async getGoogleSignupPayloadFromSession(req: express.Request, appScope?: string | null) {
    const claimedAppScope = this.requireClaimedConsumerAppScope(req, appScope);
    const token = this.getGoogleSignupSessionTokenFromRequest(req, claimedAppScope);
    if (!token) return undefined;
    const record = await this.oauthStateStore.readSignupSession(token);
    if (!record) return undefined;
    const storedAppScope = this.requireStoredConsumerAppScopeMatchesRequest(req, record.appScope);
    if (storedAppScope !== claimedAppScope) {
      throw new UnauthorizedException(`Invalid app scope`);
    }
    return this.service.validateGoogleSignupPayload(this.service.createGoogleSignupPayload(record));
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
  @Get(`google/signup-session`)
  @ApiOkResponse({ type: CONSUMER.GoogleSignupSessionResponse })
  async googleSignupSession(@Req() req: express.Request, @Query(`appScope`) appScope?: string) {
    const payload = await this.getGoogleSignupPayloadFromSession(req, appScope);
    if (!payload) throw new BadRequestException(errorCodes.MISSING_SIGNUP_TOKEN);

    return {
      email: payload.email,
      givenName: payload.givenName,
      familyName: payload.familyName,
      picture: payload.picture,
      accountType: payload.accountType,
      contractorKind: payload.contractorKind,
      nextPath: payload.nextPath,
      signupEntryPath: payload.signupEntryPath,
    };
  }

  @PublicEndpoint()
  @TrackConsumerAction({ action: `consumer.auth.google_signup_session_establish`, resource: `auth` })
  @Post(`google/signup-session/establish`)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: CONSUMER.HandoffTokenRequest })
  @ApiOkResponse({ type: CONSUMER.GoogleSignupSessionResponse })
  async establishGoogleSignupSession(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res,
    @Body() body: HandoffTokenRequest,
    @Query(`appScope`) appScope?: string,
  ) {
    const claimedAppScope = this.requireClaimedConsumerAppScope(req, appScope);
    const handoffToken = body.handoffToken;
    if (!handoffToken) throw new BadRequestException(errorCodes.MISSING_SIGNUP_TOKEN);
    const payload = await this.oauthStateStore.consumeSignupHandoff(handoffToken);
    if (!payload) throw new BadRequestException(errorCodes.INVALID_GOOGLE_SIGNUP_TOKEN);
    const storedAppScope = this.requireStoredConsumerAppScopeMatchesRequest(req, payload.appScope);
    if (storedAppScope !== claimedAppScope) {
      throw new UnauthorizedException(`Invalid app scope`);
    }

    const validatedPayload = this.service.validateGoogleSignupPayload(this.service.createGoogleSignupPayload(payload));
    const signupSessionToken = this.oauthStateStore.createEphemeralToken();
    await this.oauthStateStore.saveSignupSession(signupSessionToken, payload, this.googleSignupSessionTtlMs);
    this.setGoogleSignupSessionCookie(req, res, signupSessionToken, claimedAppScope);

    return {
      email: validatedPayload.email,
      givenName: validatedPayload.givenName,
      familyName: validatedPayload.familyName,
      picture: validatedPayload.picture,
      accountType: validatedPayload.accountType,
      contractorKind: validatedPayload.contractorKind,
      nextPath: validatedPayload.nextPath,
      signupEntryPath: validatedPayload.signupEntryPath,
    };
  }

  @PublicEndpoint()
  @TrackConsumerAction({ action: `consumer.auth.oauth_complete`, resource: `auth` })
  @Post(`oauth/complete`)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: CONSUMER.HandoffTokenRequest })
  @ApiOkResponse({ type: CONSUMER.OAuthCompleteResponse })
  async oauthComplete(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res,
    @Body() body: HandoffTokenRequest,
    @Query(`appScope`) appScope?: string,
  ) {
    const claimedAppScope = this.requireClaimedConsumerAppScope(req, appScope);
    const handoffToken = body.handoffToken;
    if (!handoffToken) throw new BadRequestException(errorCodes.MISSING_EXCHANGE_TOKEN);
    const decoded = await this.oauthStateStore.consumeLoginHandoff(handoffToken);
    if (!decoded) throw new UnauthorizedException(errorCodes.INVALID_OAUTH_EXCHANGE_TOKEN);
    const storedAppScope = this.requireStoredConsumerAppScopeMatchesRequest(req, decoded.appScope);
    if (storedAppScope !== claimedAppScope) {
      throw new UnauthorizedException(`Invalid app scope`);
    }
    const { accessToken, refreshToken } = await this.service.issueTokensForConsumer(
      decoded.identityId,
      claimedAppScope,
    );
    this.setAuthCookies(req, res, accessToken, refreshToken, claimedAppScope);
    return { ok: true, next: decoded.nextPath };
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
