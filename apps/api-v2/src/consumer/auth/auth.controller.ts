import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  Res,
  Req,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import express from 'express';

import { type ConsumerAppScope } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';
import { oauthCrypto } from '@remoola/security-utils';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerAuthService } from './auth.service';
import { ConsumerAuthControllerSupportService } from './consumer-auth-controller-support.service';
import { ConsumerSignup } from './dto';
import { GoogleOAuthService } from './google-oauth.service';
import { OAuthStateStoreService } from './oauth-state-store.service';
import { LoginBody } from '../../auth/dto/login.dto';
import { Identity, type IIdentityContext, PublicEndpoint, TrackConsumerAction } from '../../common';
import { CONSUMER } from '../../dtos';
import { envs } from '../../envs';
import { TransformResponse } from '../../interceptors';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { getApiOAuthStateCookieKey, removeNil } from '../../shared-common';

@ApiTags(`Consumer: Auth`)
@Controller(`consumer/auth`)
export class ConsumerAuthController {
  private readonly logger = new Logger(ConsumerAuthController.name);
  private readonly oauthStateTtlMs = 5 * 60 * 1000;
  private readonly oauthLoginHandoffTtlMs = 2 * 60 * 1000;
  private readonly googleSignupSessionTtlMs = 10 * 60 * 1000;
  private readonly maxOAuthNextPathLength = 512;

  constructor(
    private readonly service: ConsumerAuthService,
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly oauthStateStore: OAuthStateStoreService,
    private readonly originResolver: OriginResolverService,
    private readonly supportService: ConsumerAuthControllerSupportService,
  ) {}

  private requireConsumerAppScope(appScope?: string | null): ConsumerAppScope {
    return this.supportService.requireConsumerAppScope(appScope);
  }

  private requireRequestConsumerAppScope(req: express.Request): ConsumerAppScope {
    return this.supportService.requireRequestConsumerAppScope(req);
  }

  private requireClaimedConsumerAppScope(req: express.Request, appScope?: string | null): ConsumerAppScope {
    return this.supportService.requireClaimedConsumerAppScope(req, appScope);
  }

  private resolveConfiguredConsumerOrigin(scope: ConsumerAppScope): string {
    return this.supportService.resolveConfiguredConsumerOrigin(scope);
  }

  private getOAuthStateCookieFromRequest(req: express.Request, appScope: ConsumerAppScope): string | undefined {
    return this.supportService.getOAuthStateCookieFromRequest(req, appScope);
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

  private getOAuthCookieOptions(req?: express.Request) {
    return this.supportService.getOAuthCookieOptions(req, this.oauthStateTtlMs);
  }

  private getOAuthClearCookieOptions(req?: express.Request) {
    return this.supportService.getOAuthClearCookieOptions(req, this.oauthStateTtlMs);
  }

  private normalizeNextPath(next?: string) {
    return this.supportService.normalizeNextPath(next, this.maxOAuthNextPathLength);
  }

  private getSignupEntryPathFromNext(next?: string) {
    return this.supportService.getSignupEntryPathFromNext(next, this.maxOAuthNextPathLength);
  }

  private normalizeSignupCompletionPath(next?: string) {
    return this.supportService.normalizeSignupCompletionPath(next, this.maxOAuthNextPathLength);
  }

  private requireStoredConsumerAppScopeMatchesRequest(
    req: express.Request,
    storedAppScope?: string | null,
  ): ConsumerAppScope {
    return this.supportService.requireStoredConsumerAppScopeMatchesRequest(req, storedAppScope);
  }

  private isOAuthStateCookieFallbackAllowedInEnv(): boolean {
    return this.supportService.isOAuthStateCookieFallbackAllowedInEnv();
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

  private buildConsumerRedirect(appScope: ConsumerAppScope, nextPath: string, extraParams?: Record<string, string>) {
    return this.supportService.buildConsumerRedirect(appScope, nextPath, extraParams);
  }

  private buildConsumerLoginRedirect(errorCode: string, appScope: ConsumerAppScope) {
    return this.supportService.buildConsumerLoginRedirect(errorCode, appScope);
  }

  private buildConsumerSignupRedirect(
    appScope: ConsumerAppScope,
    googleSignupHandoff: string,
    signupEntryPath?: string,
    accountType?: string,
    contractorKind?: string,
  ) {
    return this.supportService.buildConsumerSignupRedirect(
      appScope,
      googleSignupHandoff,
      signupEntryPath,
      accountType,
      contractorKind,
    );
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

  @TrackConsumerAction({ action: `consumer.auth.oauth_start`, resource: `auth` })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @PublicEndpoint()
  @Get(`google/start`)
  async googleOAuthStart(
    @Req() req: express.Request,
    @Res() response: express.Response,
    @Query(`appScope`) appScope?: string,
    @Query(`next`) next?: string,
    @Query(`signupPath`) signupPath?: string,
    @Query(`accountType`) accountType?: string,
    @Query(`contractorKind`) contractorKind?: string,
  ) {
    const validatedAccountType =
      accountType === $Enums.AccountType.BUSINESS || accountType === $Enums.AccountType.CONTRACTOR
        ? accountType
        : undefined;
    const validatedContractorKind =
      contractorKind === $Enums.ContractorKind.INDIVIDUAL || contractorKind === $Enums.ContractorKind.ENTITY
        ? contractorKind
        : undefined;

    const consumerScope = this.requireConsumerAppScope(appScope);

    const nextPath = this.normalizeNextPath(next);
    const signupEntryPath = signupPath === `/signup` ? `/signup` : this.getSignupEntryPathFromNext(next);
    const nonce = oauthCrypto.generateOAuthNonce();
    const codeVerifier = GoogleOAuthService.createCodeVerifier();
    const codeChallenge = GoogleOAuthService.createCodeChallenge(codeVerifier);

    const stateToken = this.oauthStateStore.createStateToken();
    const createdAt = Date.now();
    await this.oauthStateStore.save(
      stateToken,
      {
        nonce,
        codeVerifier,
        nextPath,
        createdAt,
        appScope: consumerScope,
        signupEntryPath,
        accountType: validatedAccountType,
        contractorKind: validatedContractorKind,
      },
      this.oauthStateTtlMs,
    );

    response.cookie(getApiOAuthStateCookieKey(req, consumerScope), stateToken, this.getOAuthCookieOptions(req));
    const authUrl = this.googleOAuthService.buildAuthorizationUrl(stateToken, codeChallenge, nonce);
    return response.redirect(authUrl);
  }

  @TrackConsumerAction({ action: `consumer.auth.oauth_callback`, resource: `auth` })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @PublicEndpoint()
  @Get(`google/callback`)
  async googleOAuthCallback(
    @Req() req: express.Request,
    @Res() response: express.Response,
    @Query(`code`) code?: string,
    @Query(`state`) state?: string,
    @Query(`error`) error?: string,
  ) {
    const stateRecordPreview = state ? await this.oauthStateStore.read(state) : null;
    const stateCookie = stateRecordPreview?.appScope
      ? this.getOAuthStateCookieFromRequest(req, stateRecordPreview.appScope)
      : undefined;

    const clearStateCookie = (consumerScope?: string | null) => {
      const validatedAppScope =
        this.originResolver.validateConsumerAppScope(consumerScope) ?? stateRecordPreview?.appScope;
      if (!validatedAppScope) {
        return;
      }
      response.clearCookie(getApiOAuthStateCookieKey(req, validatedAppScope), this.getOAuthClearCookieOptions(req));
    };

    const failureRedirect = (reason: string, appScope?: string | null) => {
      const validatedAppScope = this.originResolver.validateConsumerAppScope(appScope) ?? stateRecordPreview?.appScope;
      if (!validatedAppScope) {
        throw new BadRequestException(`Invalid OAuth state`);
      }
      clearStateCookie(validatedAppScope);
      const url = this.buildConsumerLoginRedirect(reason, validatedAppScope);
      return response.redirect(url);
    };

    const consumeStateAppScope = async (maybeState?: string) => {
      if (!maybeState) return undefined;
      const record = maybeState === state ? stateRecordPreview : await this.oauthStateStore.read(maybeState);
      return record?.appScope;
    };

    if (error) {
      const errorAppScope = await consumeStateAppScope(state);
      return failureRedirect(`access_denied`, errorAppScope);
    }

    if (!state) return failureRedirect(`invalid_state`);
    if (stateCookie && stateCookie !== state) {
      if (!this.isOAuthStateCookieFallbackAllowedInEnv()) {
        const mismatchAppScope = await consumeStateAppScope(state);
        return failureRedirect(`invalid_state`, mismatchAppScope);
      }
      this.logger.warn({
        event: `oauth_state_cookie_mismatch_auto_fallback_dev_or_test`,
        nodeEnv: envs.NODE_ENV,
      });
    }
    if (!stateCookie) {
      if (!this.isOAuthStateCookieFallbackAllowedInEnv()) {
        const fallbackBlockedAppScope = await consumeStateAppScope(state);
        return failureRedirect(`invalid_state`, fallbackBlockedAppScope);
      }
      this.logger.warn({
        event: `oauth_state_cookie_missing_auto_fallback_dev_or_test`,
        nodeEnv: envs.NODE_ENV,
      });
    }
    const stateRecord = await this.oauthStateStore.consume(state);
    if (!stateRecord) return failureRedirect(`expired_state`);
    if (Date.now() - stateRecord.createdAt > this.oauthStateTtlMs)
      return failureRedirect(`expired_state`, stateRecord.appScope);
    if (!code) return failureRedirect(`missing_code`, stateRecord.appScope);

    const stateAppScope = stateRecord.appScope;

    try {
      const payload = await this.googleOAuthService.exchangeCodeForPayload(
        code,
        stateRecord.codeVerifier,
        stateRecord.nonce,
      );

      const email = payload.email?.toLowerCase();
      if (!email) throw new BadRequestException(errorCodes.GOOGLE_ACCOUNT_NO_EMAIL_CALLBACK);
      if (!payload.email_verified) throw new UnauthorizedException(errorCodes.GOOGLE_EMAIL_NOT_VERIFIED_CALLBACK);

      const existing = await this.service.findConsumerByEmail(email);
      if (!existing) {
        const googleSignupHandoff = this.oauthStateStore.createEphemeralToken();
        await this.oauthStateStore.saveSignupHandoff(
          googleSignupHandoff,
          {
            email,
            emailVerified: !!payload.email_verified,
            name: (payload.name as string) ?? null,
            givenName: (payload.given_name as string) ?? null,
            familyName: (payload.family_name as string) ?? null,
            picture: (payload.picture as string) ?? null,
            organization: typeof payload.hd === `string` ? payload.hd : null,
            sub: (payload.sub as string) ?? null,
            signupEntryPath: stateRecord.signupEntryPath ?? null,
            nextPath: stateRecord.nextPath,
            accountType: stateRecord.accountType ?? null,
            contractorKind: stateRecord.contractorKind ?? null,
            appScope: stateRecord.appScope,
          },
          this.googleSignupSessionTtlMs,
        );

        clearStateCookie(stateRecord.appScope);
        const redirectUrl = this.buildConsumerSignupRedirect(
          stateRecord.appScope,
          googleSignupHandoff,
          stateRecord.signupEntryPath ?? this.getSignupEntryPathFromNext(stateRecord.nextPath),
          stateRecord.accountType,
          stateRecord.contractorKind,
        );
        return response.redirect(redirectUrl);
      }

      const consumer = await this.googleOAuthService.loginWithPayload(email, payload);
      const oauthHandoff = this.oauthStateStore.createEphemeralToken();
      await this.oauthStateStore.saveLoginHandoff(
        oauthHandoff,
        {
          identityId: consumer.id,
          nextPath: this.normalizeSignupCompletionPath(stateRecord.nextPath),
          appScope: stateRecord.appScope,
        },
        this.oauthLoginHandoffTtlMs,
      );

      clearStateCookie(stateRecord.appScope);
      const redirectUrl = this.buildConsumerRedirect(
        stateRecord.appScope,
        this.normalizeSignupCompletionPath(stateRecord.nextPath),
        { oauthHandoff },
      );
      return response.redirect(redirectUrl);
    } catch (error: unknown) {
      this.logger.error(`OAuth callback failed`, {
        hasStateRecord: !!stateRecord,
        appScope: stateAppScope,
        errorName: error instanceof Error ? error.name : `UnknownError`,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return failureRedirect(`login_failed`, stateAppScope);
    }
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
    @Body(`handoffToken`) handoffToken: string,
    @Query(`appScope`) appScope?: string,
  ) {
    const claimedAppScope = this.requireClaimedConsumerAppScope(req, appScope);
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
    @Body(`handoffToken`) handoffToken: string,
    @Query(`appScope`) appScope?: string,
  ) {
    const claimedAppScope = this.requireClaimedConsumerAppScope(req, appScope);
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

  @PublicEndpoint()
  @TrackConsumerAction({ action: `consumer.auth.signup`, resource: `auth` })
  @Post(`signup`)
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: CONSUMER.SignupResponse })
  @TransformResponse(CONSUMER.SignupResponse)
  async signup(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res,
    @Body() body: ConsumerSignup,
    @Query(`appScope`) appScope?: string,
  ) {
    const payload = removeNil(body);
    const consumerScope = this.requireClaimedConsumerAppScope(req, appScope);
    const googleSignupPayload = await this.getGoogleSignupPayloadFromSession(req, appScope);
    const consumer = await this.service.signup(payload, googleSignupPayload);
    if (!googleSignupPayload) {
      return { consumer };
    }

    const { accessToken, refreshToken } = await this.service.issueTokensForConsumer(consumer.id, consumerScope);
    this.setAuthCookies(req, res, accessToken, refreshToken, consumerScope);
    this.clearGoogleSignupSessionCookie(req, res, consumerScope);
    return {
      consumer,
      next: this.normalizeSignupCompletionPath(googleSignupPayload.nextPath ?? undefined),
    };
  }

  @PublicEndpoint()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get(`signup/:consumerId/complete-profile-creation`)
  completeProfileCreation(
    @Req() req: express.Request,
    @Param(`consumerId`) consumerId: string,
    @Query(`appScope`) appScope?: string,
  ) {
    const consumerScope = this.requireClaimedConsumerAppScope(req, appScope);
    void this.service.completeProfileCreationAndSendVerificationEmail(consumerId, consumerScope).catch((error) =>
      this.logger.warn({
        event: `signup_complete_profile_creation_email_failed`,
        consumerId,
        errorClass: error instanceof Error ? error.constructor.name : `UnknownError`,
      }),
    );
    return `success`;
  }

  @PublicEndpoint()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get(`forgot-password/verify`)
  async forgotPasswordVerify(@Query(`token`) token: string, @Res() res: express.Response) {
    await this.service.validateForgotPasswordTokenAndRedirect(token ?? ``, res);
  }

  @PublicEndpoint()
  @TrackConsumerAction({ action: `consumer.auth.forgot_password_request`, resource: `auth` })
  @Post(`forgot-password`)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Req() req: express.Request,
    @Body() body: CONSUMER.ForgotPasswordBody,
    @Query(`appScope`) appScope?: string,
  ) {
    const consumerScope = this.requireClaimedConsumerAppScope(req, appScope);
    await this.service.requestPasswordReset(body.email, consumerScope);
    return {
      message: `If an account exists, we sent recovery instructions.`,
      recoveryMode: `provider_aware`,
    };
  }

  @PublicEndpoint()
  @Post(`password/reset`)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: CONSUMER.ResetPasswordDto) {
    await this.service.resetPasswordWithToken(body.token, body.password);
    return { success: true };
  }

  @PublicEndpoint()
  @Get(`signup/verification`)
  signupVerification(@Query(`token`) token: string, @Res() res: express.Response) {
    return this.service.signupVerification(token, res);
  }
}
