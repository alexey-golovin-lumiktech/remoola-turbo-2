import {
  Body,
  GoneException,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Param,
  Post,
  Query,
  Res,
  Req,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiBody, ApiTags, ApiBasicAuth, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import express from 'express';

import { getConsumerRefreshTokenCookieKeysForRead, getCookieClearOptions } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';
import { oauthCrypto } from '@remoola/security-utils';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerAuthService } from './auth.service';
import { ConsumerSignup } from './dto';
import { GoogleOAuthService } from './google-oauth.service';
import { OAuthStateStoreService } from './oauth-state-store.service';
import { LoginBody } from '../../auth/dto/login.dto';
import { Identity, type IIdentityContext, PublicEndpoint, TrackConsumerAction } from '../../common';
import { CONSUMER } from '../../dtos';
import { envs, JWT_ACCESS_TTL, JWT_REFRESH_TTL } from '../../envs';
import { TransformResponse } from '../../interceptors';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import {
  CSRF_TOKEN_COOKIE_KEY,
  GOOGLE_OAUTH_STATE_COOKIE_KEY,
  getApiConsumerAccessTokenCookieKey,
  getApiConsumerAuthCookieClearOptions,
  getApiConsumerAuthCookieOptions,
  getApiConsumerCsrfCookieClearOptions,
  getApiConsumerCsrfCookieOptions,
  getApiConsumerRefreshTokenCookieKey,
  getApiOAuthStateCookieOptions,
  removeNil,
} from '../../shared-common';

@ApiTags(`Consumer: Auth`)
@ApiBearerAuth(`bearer`) // 👈 tells Swagger to attach Bearer token
@ApiBasicAuth(`basic`) // 👈 optional, if this route also accepts Basic Auth
@Controller(`consumer/auth`)
export class ConsumerAuthController {
  private readonly logger = new Logger(ConsumerAuthController.name);
  private readonly oauthStateTtlMs = 5 * 60 * 1000;
  private readonly maxOAuthNextPathLength = 512;

  constructor(
    private readonly service: ConsumerAuthService,
    private readonly googleOAuthServiceGPT: GoogleOAuthService,
    private readonly oauthStateStore: OAuthStateStoreService,
    private readonly originResolver: OriginResolverService,
  ) {}

  private getRefreshTokenFromRequest(req: express.Request): string | undefined {
    return getConsumerRefreshTokenCookieKeysForRead()
      .map((key) => req.cookies?.[key])
      .find((value): value is string => typeof value === `string` && value.length > 0);
  }

  private setAuthCookies(req: express.Request, res: express.Response, accessToken: string, refreshToken: string) {
    const common = getApiConsumerAuthCookieOptions(req);
    res.cookie(getApiConsumerAccessTokenCookieKey(req), accessToken, { ...common, maxAge: JWT_ACCESS_TTL });
    res.cookie(getApiConsumerRefreshTokenCookieKey(req), refreshToken, { ...common, maxAge: JWT_REFRESH_TTL });
    res.cookie(CSRF_TOKEN_COOKIE_KEY, oauthCrypto.generateOAuthState(), getApiConsumerCsrfCookieOptions(req));
  }

  private clearAuthCookies(req: express.Request, res: express.Response) {
    const authCookieOptions = getApiConsumerAuthCookieClearOptions(req);
    const csrfCookieOptions = getApiConsumerCsrfCookieClearOptions(req);
    res.clearCookie(getApiConsumerAccessTokenCookieKey(req), authCookieOptions);
    res.clearCookie(getApiConsumerRefreshTokenCookieKey(req), authCookieOptions);
    res.clearCookie(CSRF_TOKEN_COOKIE_KEY, csrfCookieOptions);
  }

  private getOAuthCookieOptions(req?: express.Request) {
    return {
      ...getApiOAuthStateCookieOptions(req),
      maxAge: this.oauthStateTtlMs,
    };
  }

  private getOAuthClearCookieOptions(req?: express.Request) {
    return getCookieClearOptions(this.getOAuthCookieOptions(req));
  }

  private normalizeNextPath(next?: string) {
    if (!next) return `/dashboard`;
    if (next.startsWith(`/`)) {
      if (next.startsWith(`//`)) return `/dashboard`;
      if (next.length > this.maxOAuthNextPathLength) return `/dashboard`;
      return next;
    }

    try {
      const url = new URL(next);
      if (this.originResolver.getAllowedOrigins().has(this.originResolver.normalizeOrigin(url.origin))) {
        const normalized = `${url.pathname}${url.search}${url.hash}`;
        if (normalized.length > this.maxOAuthNextPathLength) return `/dashboard`;
        return normalized;
      }
    } catch {
      // ignore invalid url
    }

    return `/dashboard`;
  }

  private validateReturnOrigin(returnOrigin?: string): string | undefined {
    return this.originResolver.validateReturnOrigin(returnOrigin);
  }

  private isOAuthStateCookieFallbackAllowedInEnv(): boolean {
    return envs.NODE_ENV === envs.ENVIRONMENT.DEVELOPMENT || envs.NODE_ENV === envs.ENVIRONMENT.TEST;
  }

  private ensureCsrf(req: express.Request) {
    const originHeader = req.headers.origin;
    if (typeof originHeader === `string` && !this.originResolver.validateReturnOrigin(originHeader)) {
      throw new UnauthorizedException(`Invalid request origin`);
    }
    const csrfHeader = req.headers[`x-csrf-token`];
    const csrfCookie = req.cookies?.[CSRF_TOKEN_COOKIE_KEY];
    const value = typeof csrfHeader === `string` ? csrfHeader : Array.isArray(csrfHeader) ? csrfHeader[0] : undefined;
    if (!value || !csrfCookie || csrfCookie !== value) {
      throw new UnauthorizedException(`Invalid CSRF token`);
    }
  }

  private buildConsumerRedirect(nextPath: string, extraParams?: Record<string, string>, returnOrigin?: string) {
    const origin = this.originResolver.resolveConsumerOrigin(returnOrigin);

    if (!origin) {
      throw new InternalServerErrorException(`CONSUMER_APP_ORIGIN is not configured`);
    }

    const url = new URL(`/auth/callback`, origin);
    url.searchParams.set(`next`, nextPath);
    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        if (value) url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

  private buildConsumerLoginRedirect(errorCode: string, returnOrigin?: string) {
    const origin = this.originResolver.resolveConsumerOrigin(returnOrigin);

    if (!origin) {
      throw new InternalServerErrorException(`CONSUMER_APP_ORIGIN is not configured`);
    }

    const url = new URL(`/login`, origin);
    url.searchParams.set(`oauth`, `google`);
    url.searchParams.set(`error`, errorCode);
    return url.toString();
  }

  private buildConsumerSignupRedirect(
    googleSignupToken: string,
    nextPath?: string,
    accountType?: string,
    contractorKind?: string,
    returnOrigin?: string,
  ) {
    const origin = this.originResolver.resolveConsumerOrigin(returnOrigin);

    if (!origin) {
      throw new InternalServerErrorException(`CONSUMER_APP_ORIGIN is not configured`);
    }

    const path = nextPath === `/signup` ? `/signup` : `/signup/start`;
    const url = new URL(path, origin);
    url.searchParams.set(`googleSignupToken`, googleSignupToken);
    if (accountType) url.searchParams.set(`accountType`, accountType);
    if (contractorKind) url.searchParams.set(`contractorKind`, contractorKind);
    return url.toString();
  }

  @PublicEndpoint()
  @TrackConsumerAction({ action: `consumer.auth.login`, resource: `auth` })
  @Post(`login`)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ operationId: `consumer_auth_login` })
  @ApiOkResponse({ type: CONSUMER.LoginResponse })
  @TransformResponse(CONSUMER.LoginResponse)
  async login(@Req() req: express.Request, @Res({ passthrough: true }) res, @Body() body: LoginBody) {
    const ipAddress = req.ip ?? req.headers[`x-forwarded-for`] ?? null;
    const userAgent = req.headers[`user-agent`] ?? null;
    const data = await this.service.login(body, {
      ipAddress: typeof ipAddress === `string` ? ipAddress : (ipAddress?.[0] ?? null),
      userAgent: typeof userAgent === `string` ? userAgent : null,
    });
    this.setAuthCookies(req, res, data.accessToken, data.refreshToken);
    return data;
  }

  @TrackConsumerAction({ action: `consumer.auth.oauth_start`, resource: `auth` })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @PublicEndpoint()
  @Get(`google/start`)
  async googleOAuthStart(
    @Req() req: express.Request,
    @Res() response: express.Response,
    @Query(`next`) next?: string,
    @Query(`accountType`) accountType?: string,
    @Query(`contractorKind`) contractorKind?: string,
    @Query(`returnOrigin`) returnOrigin?: string,
  ) {
    const validatedAccountType =
      accountType === $Enums.AccountType.BUSINESS || accountType === $Enums.AccountType.CONTRACTOR
        ? accountType
        : undefined;
    const validatedContractorKind =
      contractorKind === $Enums.ContractorKind.INDIVIDUAL || contractorKind === $Enums.ContractorKind.ENTITY
        ? contractorKind
        : undefined;

    const validatedReturnOrigin = this.validateReturnOrigin(returnOrigin);

    const nextPath = this.normalizeNextPath(next);
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
        accountType: validatedAccountType,
        contractorKind: validatedContractorKind,
        returnOrigin: validatedReturnOrigin,
      },
      this.oauthStateTtlMs,
    );

    response.cookie(GOOGLE_OAUTH_STATE_COOKIE_KEY, stateToken, this.getOAuthCookieOptions(req));
    const authUrl = this.googleOAuthServiceGPT.buildAuthorizationUrl(stateToken, codeChallenge, nonce);
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
    const clearStateCookie = () =>
      response.clearCookie(GOOGLE_OAUTH_STATE_COOKIE_KEY, this.getOAuthClearCookieOptions(req));

    const failureRedirect = (reason: string, returnOrigin?: string) => {
      clearStateCookie();
      const url = this.buildConsumerLoginRedirect(reason, returnOrigin);
      return response.redirect(url);
    };

    const consumeStateReturnOrigin = async (maybeState?: string) => {
      if (!maybeState) return undefined;
      const record = await this.oauthStateStore.consume(maybeState);
      return record?.returnOrigin;
    };

    if (error) return failureRedirect(`access_denied`);

    const stateCookie = req.cookies?.[GOOGLE_OAUTH_STATE_COOKIE_KEY];
    if (!state) return failureRedirect(`invalid_state`);
    if (stateCookie && stateCookie !== state) {
      if (!this.isOAuthStateCookieFallbackAllowedInEnv()) {
        const mismatchReturnOrigin = await consumeStateReturnOrigin(state);
        return failureRedirect(`invalid_state`, mismatchReturnOrigin);
      }
      this.logger.warn({
        event: `oauth_state_cookie_mismatch_auto_fallback_dev_or_test`,
        nodeEnv: envs.NODE_ENV,
      });
    }
    if (!stateCookie && !envs.CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK) {
      if (!this.isOAuthStateCookieFallbackAllowedInEnv()) {
        const missingCookieReturnOrigin = await consumeStateReturnOrigin(state);
        return failureRedirect(`invalid_state`, missingCookieReturnOrigin);
      }
      this.logger.warn({
        event: `oauth_state_cookie_missing_auto_fallback_dev_or_test`,
        nodeEnv: envs.NODE_ENV,
      });
    }
    if (!stateCookie && envs.CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK) {
      if (!this.isOAuthStateCookieFallbackAllowedInEnv()) {
        const fallbackBlockedReturnOrigin = await consumeStateReturnOrigin(state);
        this.logger.error({
          event: `oauth_state_cookie_missing_fallback_blocked_non_local_env`,
          nodeEnv: envs.NODE_ENV,
        });
        return failureRedirect(`invalid_state`, fallbackBlockedReturnOrigin);
      }
      this.logger.warn({
        event: `oauth_state_cookie_missing_fallback`,
        nodeEnv: envs.NODE_ENV,
      });
    }
    const stateRecord = await this.oauthStateStore.consume(state);
    if (!stateRecord) return failureRedirect(`expired_state`);
    if (Date.now() - stateRecord.createdAt > this.oauthStateTtlMs) return failureRedirect(`expired_state`);
    if (!code) return failureRedirect(`missing_code`, stateRecord.returnOrigin);

    const stateReturnOrigin = stateRecord.returnOrigin;

    try {
      const payload = await this.googleOAuthServiceGPT.exchangeCodeForPayload(
        code,
        stateRecord.codeVerifier,
        stateRecord.nonce,
      );

      const email = payload.email?.toLowerCase();
      if (!email) throw new BadRequestException(errorCodes.GOOGLE_ACCOUNT_NO_EMAIL_CALLBACK);
      if (!payload.email_verified) throw new UnauthorizedException(errorCodes.GOOGLE_EMAIL_NOT_VERIFIED_CALLBACK);

      const existing = await this.service.findConsumerByEmail(email);
      if (!existing) {
        const googleSignupToken = await this.service.createGoogleSignupToken({
          email,
          emailVerified: !!payload.email_verified,
          name: (payload.name as string) ?? null,
          givenName: (payload.given_name as string) ?? null,
          familyName: (payload.family_name as string) ?? null,
          picture: (payload.picture as string) ?? null,
          organization: typeof payload.hd === `string` ? payload.hd : null,
          sub: (payload.sub as string) ?? null,
        });

        clearStateCookie();
        const redirectUrl = this.buildConsumerSignupRedirect(
          googleSignupToken,
          stateRecord.nextPath,
          stateRecord.accountType,
          stateRecord.contractorKind,
          stateRecord.returnOrigin,
        );
        return response.redirect(redirectUrl);
      }

      const consumer = await this.googleOAuthServiceGPT.loginWithPayload(email, payload);
      const { accessToken, refreshToken } = await this.service.issueTokensForConsumer(consumer.id);
      const exchangeToken = await this.service.createOAuthExchangeToken(consumer.id);

      this.setAuthCookies(req, response, accessToken, refreshToken);
      clearStateCookie();
      const redirectUrl = this.buildConsumerRedirect(
        stateRecord.nextPath,
        { oauthToken: exchangeToken },
        stateRecord.returnOrigin,
      );
      return response.redirect(redirectUrl);
    } catch {
      this.logger.error(`OAuth callback failed`, {
        hasStateRecord: !!stateRecord,
        hasReturnOrigin: !!stateReturnOrigin,
      });
      return failureRedirect(`login_failed`, stateReturnOrigin);
    }
  }

  @PublicEndpoint()
  @Get(`google/signup-session`)
  async googleSignupSession(@Query(`token`) token: string) {
    if (!token) throw new BadRequestException(errorCodes.MISSING_SIGNUP_TOKEN);
    const payload = await this.service.verifyGoogleSignupToken(token);

    return {
      email: payload.email,
      givenName: payload.givenName,
      familyName: payload.familyName,
      picture: payload.picture,
    };
  }

  @PublicEndpoint()
  @Get(`google-new-way`)
  @ApiOkResponse({ type: CONSUMER.GoogleOAuthNewWayResponse })
  @TransformResponse(CONSUMER.GoogleOAuthNewWayResponse)
  googleOAuthNewWay() {
    throw new GoneException(`Deprecated endpoint. Use /consumer/auth/google/start`);
  }

  @PublicEndpoint()
  @Get(`google-redirect-new-way`)
  @ApiOkResponse({ type: CONSUMER.LoginResponse })
  @TransformResponse(CONSUMER.LoginResponse)
  googleOAuthNewWayRedirect() {
    throw new GoneException(`Deprecated endpoint. Use /consumer/auth/google/start`);
  }

  @PublicEndpoint()
  @Post(`google-oauth`)
  @ApiOkResponse({ type: CONSUMER.LoginResponse })
  @TransformResponse(CONSUMER.LoginResponse)
  googleOAuth() {
    throw new GoneException(`Deprecated endpoint. Use Authorization Code flow via /consumer/auth/google/start`);
  }

  @PublicEndpoint()
  @Post(`google-login-gpt`)
  @HttpCode(HttpStatus.OK)
  googleLoginGPT() {
    throw new GoneException(`Deprecated endpoint. Use Authorization Code flow via /consumer/auth/google/start`);
  }

  @PublicEndpoint()
  @TrackConsumerAction({ action: `consumer.auth.oauth_exchange`, resource: `auth` })
  @Post(`oauth/exchange`)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async oauthExchange(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res,
    @Body(`exchangeToken`) exchangeToken: string,
  ) {
    if (!exchangeToken) throw new BadRequestException(errorCodes.MISSING_EXCHANGE_TOKEN);
    const decoded = await this.service.verifyOAuthExchangeToken(exchangeToken);
    const { accessToken, refreshToken } = await this.service.issueTokensForConsumer(decoded.identityId);
    this.setAuthCookies(req, res, accessToken, refreshToken);
    return { ok: true };
  }

  @PublicEndpoint()
  @Post(`logout`)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: express.Request, @Res({ passthrough: true }) res) {
    this.ensureCsrf(req);
    const ipAddress = req.ip ?? req.headers[`x-forwarded-for`] ?? null;
    const userAgent = req.headers[`user-agent`] ?? null;
    await this.service.revokeSessionByRefreshTokenAndAudit(this.getRefreshTokenFromRequest(req), {
      ipAddress: typeof ipAddress === `string` ? ipAddress : Array.isArray(ipAddress) ? ipAddress[0] : null,
      userAgent: typeof userAgent === `string` ? userAgent : null,
    });
    this.clearAuthCookies(req, res);
    res.clearCookie(GOOGLE_OAUTH_STATE_COOKIE_KEY, this.getOAuthClearCookieOptions(req));
    return { ok: true };
  }

  @PublicEndpoint()
  @Post(`refresh`)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ operationId: `refresh_access` })
  @ApiOkResponse({ type: CONSUMER.LoginResponse })
  async refreshAccess(@Req() req: express.Request, @Res({ passthrough: true }) res) {
    this.ensureCsrf(req);
    const ipAddress = req.ip ?? req.headers[`x-forwarded-for`] ?? null;
    const userAgent = req.headers[`user-agent`] ?? null;
    const refreshToken = this.getRefreshTokenFromRequest(req);
    if (!refreshToken) throw new UnauthorizedException(errorCodes.INVALID_REFRESH_TOKEN);
    const data = await this.service.refreshAccess(refreshToken, {
      ipAddress: typeof ipAddress === `string` ? ipAddress : (ipAddress?.[0] ?? null),
      userAgent: typeof userAgent === `string` ? userAgent : null,
    });
    this.setAuthCookies(req, res, data.accessToken, data.refreshToken);
    return data;
  }

  @PublicEndpoint()
  @Post(`refresh-access`)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ operationId: `refresh_access_legacy` })
  @ApiBody({ schema: { type: `object`, properties: { refreshToken: { type: `string` } } } })
  @ApiOkResponse({ type: CONSUMER.LoginResponse })
  async refreshAccessLegacy(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res,
    @Body(`refreshToken`) refreshToken: string,
  ) {
    const data = await this.service.refreshAccess(refreshToken);
    this.setAuthCookies(req, res, data.accessToken, data.refreshToken);
    return data;
  }

  @Post(`logout-all`)
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @Req() req: express.Request,
    @Identity() identity: IIdentityContext,
    @Res({ passthrough: true }) res,
  ) {
    this.ensureCsrf(req);
    const ipAddress = req.ip ?? req.headers[`x-forwarded-for`] ?? null;
    const userAgent = req.headers[`user-agent`] ?? null;
    await this.service.revokeAllSessionsByConsumerIdAndAudit(identity.id, {
      ipAddress: typeof ipAddress === `string` ? ipAddress : Array.isArray(ipAddress) ? ipAddress[0] : null,
      userAgent: typeof userAgent === `string` ? userAgent : null,
    });
    this.clearAuthCookies(req, res);
    res.clearCookie(GOOGLE_OAUTH_STATE_COOKIE_KEY, this.getOAuthClearCookieOptions(req));
    return { ok: true };
  }

  @TrackConsumerAction({ action: `consumer.auth.me`, resource: `auth` })
  @Get(`me`)
  me(@Identity() identity: IIdentityContext) {
    return identity;
  }

  @PublicEndpoint()
  @TrackConsumerAction({ action: `consumer.auth.signup`, resource: `auth` })
  @Post(`signup`)
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() body: ConsumerSignup) {
    const payload = removeNil(body);
    const token = payload.googleSignupToken;
    const googleSignupPayload = token ? await this.service.verifyGoogleSignupToken(token) : undefined;
    const consumer = await this.service.signup(payload, googleSignupPayload);
    return { consumer };
  }

  @PublicEndpoint()
  @Get(`signup/:consumerId/complete-profile-creation`)
  completeProfileCreation(@Req() req: express.Request, @Param(`consumerId`) consumerId: string) {
    const referer = req.headers.origin || req.headers.referer;
    if (!referer) throw new InternalServerErrorException(`Request origin required`);
    this.service.completeProfileCreationAndSendVerificationEmail(consumerId, referer);
    return `success`;
  }

  @PublicEndpoint()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get(`forgot-password/verify`)
  async forgotPasswordVerify(
    @Query(`token`) token: string,
    @Query(`referer`) referer: string,
    @Res() res: express.Response,
  ) {
    if (!referer) throw new InternalServerErrorException(`Request referer required`);
    await this.service.validateForgotPasswordTokenAndRedirect(token ?? ``, referer, res);
  }

  @PublicEndpoint()
  @TrackConsumerAction({ action: `consumer.auth.forgot_password_request`, resource: `auth` })
  @Post(`forgot-password`)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: CONSUMER.ForgotPasswordBody, @Headers(`origin`) requestOrigin?: string) {
    await this.service.requestPasswordReset(body.email, requestOrigin);
    return { message: `If an account exists, we sent instructions.` };
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
  signupVerification(@Query(`referer`) referer: string, @Query(`token`) token: string, @Res() res: express.Response) {
    if (!referer) throw new InternalServerErrorException(`Request origin required`);
    return this.service.signupVerification(token, res, referer);
  }
}
