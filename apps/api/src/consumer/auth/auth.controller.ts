import { type IncomingHttpHeaders } from 'http';

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
  Patch,
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

import { $Enums, type ConsumerModel } from '@remoola/database-2';
import { oauthCrypto } from '@remoola/security-utils';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerAuthService } from './auth.service';
import { ConsumerSignup } from './dto';
import { GoogleOAuthService } from './google-oauth.service';
import { OAuthStateStoreService } from './oauth-state-store.service';
import { LoginBody } from '../../auth/dto/login.dto';
import { Identity, PublicEndpoint } from '../../common';
import { CONSUMER } from '../../dtos';
import { envs, JWT_ACCESS_TTL, JWT_REFRESH_TTL } from '../../envs';
import { TransformResponse } from '../../interceptors';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import {
  CONSUMER_ACCESS_TOKEN_COOKIE_KEY,
  CONSUMER_REFRESH_TOKEN_COOKIE_KEY,
  GOOGLE_OAUTH_STATE_COOKIE_KEY,
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

  private getAuthCookieOptions(req?: express.Request) {
    const isProd = envs.NODE_ENV === `production`;
    const isVercel = envs.VERCEL !== 0;
    const forwardedProto = req?.headers?.[`x-forwarded-proto`];
    const isSecureRequest =
      req?.secure === true || (typeof forwardedProto === `string` && forwardedProto.split(`,`)[0]?.trim() === `https`);
    const sameSite = isSecureRequest || isProd || isVercel ? (`none` as const) : (`lax` as const);
    const secure = isSecureRequest || isVercel || isProd || envs.COOKIE_SECURE;

    return {
      httpOnly: true,
      sameSite,
      secure,
      path: `/`,
    };
  }

  private setAuthCookies(res: express.Response, accessToken: string, refreshToken: string, req?: express.Request) {
    const common = this.getAuthCookieOptions(req);
    res.cookie(CONSUMER_ACCESS_TOKEN_COOKIE_KEY, accessToken, { ...common, maxAge: JWT_ACCESS_TTL });
    res.cookie(CONSUMER_REFRESH_TOKEN_COOKIE_KEY, refreshToken, { ...common, maxAge: JWT_REFRESH_TTL });
  }

  private clearAuthCookies(res: express.Response, req?: express.Request) {
    const common = this.getAuthCookieOptions(req);
    res.clearCookie(CONSUMER_ACCESS_TOKEN_COOKIE_KEY, common);
    res.clearCookie(CONSUMER_REFRESH_TOKEN_COOKIE_KEY, common);
  }

  private getOAuthCookieOptions(req?: express.Request) {
    const isProd = envs.NODE_ENV === `production`;
    const isVercel = envs.VERCEL !== 0;
    const forwardedProto = req?.headers?.[`x-forwarded-proto`];
    const isSecureRequest =
      req?.secure === true || (typeof forwardedProto === `string` && forwardedProto.split(`,`)[0]?.trim() === `https`);
    const sameSite = isSecureRequest ? (`none` as const) : (`lax` as const);
    const secure = isSecureRequest || isVercel || isProd || envs.COOKIE_SECURE;

    return {
      httpOnly: true,
      sameSite,
      secure,
      path: `/`,
      maxAge: this.oauthStateTtlMs,
    };
  }

  private getOAuthClearCookieOptions(req?: express.Request) {
    const { httpOnly, sameSite, secure, path } = this.getOAuthCookieOptions(req);
    return { httpOnly, sameSite, secure, path };
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
    this.setAuthCookies(res, data.accessToken, data.refreshToken, req);
    return data;
  }

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

    if (error) return failureRedirect(`access_denied`);

    const stateCookie = req.cookies?.[GOOGLE_OAUTH_STATE_COOKIE_KEY];
    if (!state) return failureRedirect(`invalid_state`);
    if (stateCookie && stateCookie !== state) return failureRedirect(`invalid_state`);
    if (!code) return failureRedirect(`missing_code`);

    const stateRecord = await this.oauthStateStore.consume(state);
    if (!stateRecord) return failureRedirect(`expired_state`);
    if (Date.now() - stateRecord.createdAt > this.oauthStateTtlMs) return failureRedirect(`expired_state`);

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

      this.setAuthCookies(response, accessToken, refreshToken, req);
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
    this.setAuthCookies(res, accessToken, refreshToken, req);
    return { ok: true };
  }

  @PublicEndpoint()
  @Post(`logout`)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: express.Request, @Res({ passthrough: true }) res) {
    const ipAddress = req.ip ?? req.headers[`x-forwarded-for`] ?? null;
    const userAgent = req.headers[`user-agent`] ?? null;
    await this.service.revokeSessionByRefreshTokenAndAudit(req.cookies?.[CONSUMER_REFRESH_TOKEN_COOKIE_KEY], {
      ipAddress: typeof ipAddress === `string` ? ipAddress : Array.isArray(ipAddress) ? ipAddress[0] : null,
      userAgent: typeof userAgent === `string` ? userAgent : null,
    });
    this.clearAuthCookies(res, req);
    res.clearCookie(GOOGLE_OAUTH_STATE_COOKIE_KEY, this.getOAuthClearCookieOptions(req));
    return { ok: true };
  }

  @PublicEndpoint()
  @Post(`refresh-access`)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ operationId: `refresh_access` })
  @ApiBody({ schema: { type: `object`, properties: { refreshToken: { type: `string` } } } })
  @ApiOkResponse({ type: CONSUMER.LoginResponse })
  refreshAccess(@Body(`refreshToken`) refreshToken: string) {
    return this.service.refreshAccess(refreshToken);
  }

  @PublicEndpoint()
  @Post(`change-password`)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  checkEmailAndSendRecoveryLink(@Headers() headers: IncomingHttpHeaders, @Body() body: { email: string }) {
    const referer = headers.origin || headers.referer;
    if (!referer) throw new InternalServerErrorException(`Request origin required`);
    return this.service.checkEmailAndSendRecoveryLink(removeNil(body), referer);
  }

  @PublicEndpoint()
  @Patch(`change-password/:token`)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  changePassword(@Param() param: CONSUMER.ChangePasswordParam, @Body() body: CONSUMER.ChangePasswordBody) {
    return this.service.changePassword(removeNil(body), removeNil(param));
  }

  @Get(`me`)
  me(@Identity() consumer: ConsumerModel) {
    return consumer;
  }

  @PublicEndpoint()
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
  @Get(`signup/verification`)
  signupVerification(@Query(`referer`) referer: string, @Query(`token`) token: string, @Res() res: express.Response) {
    if (!referer) throw new InternalServerErrorException(`Request origin required`);
    return this.service.signupVerification(token, res, referer);
  }
}
