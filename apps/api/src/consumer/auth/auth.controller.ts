import crypto from 'crypto';
import { type IncomingHttpHeaders } from 'http';

import {
  Body,
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
import express from 'express';
import _ from 'lodash';

import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerAuthService } from './auth.service';
import { ConsumerSignup, GoogleOAuthBody } from './dto';
import { GoogleAuthService } from './google-auth.service';
import { GoogleOAuthService } from './google-oauth.service';
import { Identity, PublicEndpoint } from '../../common';
import { CONSUMER } from '../../dtos';
import { envs, JWT_ACCESS_TTL, JWT_REFRESH_TTL } from '../../envs';
import { TransformResponse } from '../../interceptors';
import {
  ACCESS_TOKEN_COOKIE_KEY,
  GOOGLE_OAUTH_STATE_COOKIE_KEY,
  REFRESH_TOKEN_COOKIE_KEY,
  removeNil,
} from '../../shared-common';

@ApiTags(`Consumer: Auth`)
@ApiBearerAuth(`bearer`) // 👈 tells Swagger to attach Bearer token
@ApiBasicAuth(`basic`) // 👈 optional, if this route also accepts Basic Auth
@Controller(`consumer/auth`)
export class ConsumerAuthController {
  private readonly logger = new Logger(ConsumerAuthController.name);
  private readonly oauthStateTtlMs = 10 * 60 * 1000;

  constructor(
    private readonly service: ConsumerAuthService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly googleOAuthServiceGPT: GoogleOAuthService,
  ) {}

  private setAuthCookies(res: express.Response, accessToken: string, refreshToken: string) {
    const isProd = envs.NODE_ENV === `production`;

    if (envs.VERCEL !== 0) {
      const vercelCookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: `none`,
        path: `/`,
      } as const;
      res.cookie(ACCESS_TOKEN_COOKIE_KEY, accessToken, { ...vercelCookieOptions, maxAge: JWT_ACCESS_TTL });
      res.cookie(REFRESH_TOKEN_COOKIE_KEY, refreshToken, { ...vercelCookieOptions, maxAge: JWT_REFRESH_TTL });
    } else {
      const sameSite = isProd ? (`none` as const) : (`lax` as const);
      const secure = isProd || process.env.COOKIE_SECURE == `true`;

      const common = {
        httpOnly: true,
        sameSite,
        secure,
        path: `/`,
      };

      res.cookie(ACCESS_TOKEN_COOKIE_KEY, accessToken, { ...common, maxAge: JWT_ACCESS_TTL });
      res.cookie(REFRESH_TOKEN_COOKIE_KEY, refreshToken, { ...common, maxAge: JWT_REFRESH_TTL });
    }
  }

  private getOAuthCookieOptions(req?: express.Request) {
    const isProd = envs.NODE_ENV === `production`;
    const isVercel = envs.VERCEL !== 0;
    const forwardedProto = req?.headers?.[`x-forwarded-proto`];
    const isSecureRequest =
      req?.secure === true || (typeof forwardedProto === `string` && forwardedProto.split(`,`)[0]?.trim() === `https`);
    const sameSite = isSecureRequest ? (`none` as const) : (`lax` as const);
    const secure = isSecureRequest || isVercel || isProd || process.env.COOKIE_SECURE == `true`;

    return {
      httpOnly: true,
      sameSite,
      secure,
      path: `/`,
      signed: true,
      maxAge: this.oauthStateTtlMs,
    };
  }

  private getOAuthClearCookieOptions(req?: express.Request) {
    const { httpOnly, sameSite, secure, path, signed } = this.getOAuthCookieOptions(req);
    return { httpOnly, sameSite, secure, path, signed };
  }

  private normalizeOrigin(origin: string) {
    return origin.replace(/\/$/, ``);
  }

  private allowedOrigins() {
    const origins = new Set<string>();
    if (envs.CONSUMER_APP_ORIGIN && envs.CONSUMER_APP_ORIGIN !== `CONSUMER_APP_ORIGIN`) {
      origins.add(this.normalizeOrigin(envs.CONSUMER_APP_ORIGIN));
    }
    if (Array.isArray(envs.CORS_ALLOWED_ORIGINS)) {
      for (const origin of envs.CORS_ALLOWED_ORIGINS) {
        if (origin) origins.add(this.normalizeOrigin(origin));
      }
    }
    return origins;
  }

  private normalizeNextPath(next?: string) {
    if (!next) return `/dashboard`;
    if (next.startsWith(`/`)) {
      if (next.startsWith(`//`)) return `/dashboard`;
      return next;
    }

    try {
      const url = new URL(next);
      if (this.allowedOrigins().has(this.normalizeOrigin(url.origin))) {
        return `${url.pathname}${url.search}${url.hash}`;
      }
    } catch {
      // ignore invalid url
    }

    return `/dashboard`;
  }

  private buildConsumerRedirect(nextPath: string) {
    const origin =
      envs.CONSUMER_APP_ORIGIN && envs.CONSUMER_APP_ORIGIN !== `CONSUMER_APP_ORIGIN`
        ? envs.CONSUMER_APP_ORIGIN
        : envs.CORS_ALLOWED_ORIGINS?.[0];

    if (!origin) {
      throw new InternalServerErrorException(`CONSUMER_APP_ORIGIN is not configured`);
    }

    const url = new URL(`/auth/callback`, origin);
    url.searchParams.set(`next`, nextPath);
    return url.toString();
  }

  private buildConsumerLoginRedirect(errorCode: string) {
    const origin =
      envs.CONSUMER_APP_ORIGIN && envs.CONSUMER_APP_ORIGIN !== `CONSUMER_APP_ORIGIN`
        ? envs.CONSUMER_APP_ORIGIN
        : envs.CORS_ALLOWED_ORIGINS?.[0];

    if (!origin) {
      throw new InternalServerErrorException(`CONSUMER_APP_ORIGIN is not configured`);
    }

    const url = new URL(`/login`, origin);
    url.searchParams.set(`oauth`, `google`);
    url.searchParams.set(`error`, errorCode);
    return url.toString();
  }

  private buildConsumerSignupRedirect(googleSignupToken: string) {
    const origin =
      envs.CONSUMER_APP_ORIGIN && envs.CONSUMER_APP_ORIGIN !== `CONSUMER_APP_ORIGIN`
        ? envs.CONSUMER_APP_ORIGIN
        : envs.CORS_ALLOWED_ORIGINS?.[0];

    if (!origin) {
      throw new InternalServerErrorException(`CONSUMER_APP_ORIGIN is not configured`);
    }

    const url = new URL(`/signup/start`, origin);
    url.searchParams.set(`googleSignupToken`, googleSignupToken);
    return url.toString();
  }

  private createOAuthStateToken(payload: {
    nonce: string;
    codeVerifier: string;
    nextPath: string;
    createdAt: number;
  }) {
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString(`base64url`);
    const signature = crypto
      .createHmac(`sha256`, envs.SECURE_SESSION_SECRET)
      .update(payloadBase64)
      .digest(`base64url`);
    return `${payloadBase64}.${signature}`;
  }

  private parseOAuthStateToken(stateToken: string) {
    const [payloadBase64, signature] = stateToken.split(`.`);
    if (!payloadBase64 || !signature) return null;
    const expectedSignature = crypto
      .createHmac(`sha256`, envs.SECURE_SESSION_SECRET)
      .update(payloadBase64)
      .digest(`base64url`);
    if (signature !== expectedSignature) return null;
    try {
      return JSON.parse(Buffer.from(payloadBase64, `base64url`).toString(`utf-8`)) as {
        nonce: string;
        codeVerifier: string;
        nextPath: string;
        createdAt: number;
      };
    } catch {
      return null;
    }
  }

  @Post(`login`)
  @PublicEndpoint()
  @ApiOperation({ operationId: `consumer_auth_login` })
  @ApiOkResponse({ type: CONSUMER.LoginResponse })
  @TransformResponse(CONSUMER.LoginResponse)
  async login(@Res({ passthrough: true }) res, @Body() body: any) {
    const data = await this.service.login(body);
    this.setAuthCookies(res, data.accessToken, data.refreshToken);
    return data;
  }

  @PublicEndpoint()
  @Get(`google/start`)
  async googleOAuthStart(@Req() req: express.Request, @Res() response: express.Response, @Query(`next`) next?: string) {
    const nextPath = this.normalizeNextPath(next);
    const nonce = crypto.randomBytes(16).toString(`base64url`);
    const codeVerifier = GoogleOAuthService.createCodeVerifier();
    const codeChallenge = GoogleOAuthService.createCodeChallenge(codeVerifier);

    const stateToken = this.createOAuthStateToken({
      nonce,
      codeVerifier,
      nextPath,
      createdAt: Date.now(),
    });
    const cookiePayload = Buffer.from(
      JSON.stringify({
        stateToken,
        nonce,
        codeVerifier,
        nextPath,
        createdAt: Date.now(),
      }),
    ).toString(`base64url`);

    response.cookie(GOOGLE_OAUTH_STATE_COOKIE_KEY, cookiePayload, this.getOAuthCookieOptions(req));
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
    let shouldClearCookie = false;
    const failureRedirect = (reason: string) => {
      const url = this.buildConsumerLoginRedirect(reason);
      return response.redirect(url);
    };

    if (error) return failureRedirect(`access_denied`);

    const signedCookie = req.signedCookies?.[GOOGLE_OAUTH_STATE_COOKIE_KEY];
    const fallbackCookie = envs.NODE_ENV !== `production` ? req.cookies?.[GOOGLE_OAUTH_STATE_COOKIE_KEY] : undefined;
    const stateCookie = signedCookie ?? fallbackCookie;

    let cookiePayload: { stateToken: string; nonce: string; codeVerifier: string; nextPath: string; createdAt: number };
    if (stateCookie) {
      try {
        cookiePayload = JSON.parse(Buffer.from(stateCookie, `base64url`).toString(`utf-8`));
      } catch {
        return failureRedirect(`invalid_state`);
      }
      if (!state || state !== cookiePayload.stateToken) return failureRedirect(`invalid_state`);
    } else if (state) {
      const parsed = this.parseOAuthStateToken(state);
      if (!parsed) return failureRedirect(`invalid_state`);
      cookiePayload = { stateToken: state, ...parsed };
    } else {
      return failureRedirect(`missing_state`);
    }

    if (Date.now() - cookiePayload.createdAt > this.oauthStateTtlMs) return failureRedirect(`expired_state`);
    if (!code) return failureRedirect(`missing_code`);

    try {
      shouldClearCookie = true;
      const payload = await this.googleOAuthServiceGPT.exchangeCodeForPayload(
        code,
        cookiePayload.codeVerifier,
        cookiePayload.nonce,
      );

      const email = payload.email?.toLowerCase();
      if (!email) throw new BadRequestException(`Google account has no email`);
      if (!payload.email_verified) throw new UnauthorizedException(`Google email is not verified`);

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

        const redirectUrl = this.buildConsumerSignupRedirect(googleSignupToken);
        return response.redirect(redirectUrl);
      }

      const consumer = await this.googleOAuthServiceGPT.loginWithPayload(email, payload);
      const { accessToken, refreshToken } = await this.service.issueTokensForConsumer(consumer.id);

      this.setAuthCookies(response, accessToken, refreshToken);
      const redirectUrl = this.buildConsumerRedirect(cookiePayload.nextPath);
      return response.redirect(redirectUrl);
    } catch (err) {
      this.logger.error(err);
      return failureRedirect(`login_failed`);
    } finally {
      if (shouldClearCookie && !response.headersSent) {
        response.clearCookie(GOOGLE_OAUTH_STATE_COOKIE_KEY, this.getOAuthClearCookieOptions(req));
      }
    }
  }

  @PublicEndpoint()
  @Get(`google/signup-session`)
  async googleSignupSession(@Query(`token`) token: string) {
    if (!token) throw new BadRequestException(`Missing signup token`);
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
  googleOAuthNewWay(@Query() query: CONSUMER.GoogleOAuth2Query) {
    return this.googleAuthService.googleOAuthNewWay(query);
  }

  @PublicEndpoint()
  @Get(`google-redirect-new-way`)
  @ApiOkResponse({ type: CONSUMER.LoginResponse })
  @TransformResponse(CONSUMER.LoginResponse)
  async googleOAuthNewWayRedirect(@Res() response: express.Response, @Query() query: CONSUMER.RedirectCallbackQuery) {
    const queryStateHref = _.get(query, `state.href`, null);
    if (queryStateHref == null) {
      this.logger.debug({ caller: this.googleOAuthNewWayRedirect.name, payload: { queryStateHref, query } });
      return;
    }
    if (query?.error == null) await this.googleAuthService.googleOAuthNewWayRedirect(query);
    const url = new URL(queryStateHref);
    return response.status(301).redirect(url.origin + `/create-profile`);
  }

  @PublicEndpoint()
  @Post(`google-oauth`)
  @ApiOkResponse({ type: CONSUMER.LoginResponse })
  @TransformResponse(CONSUMER.LoginResponse)
  googleOAuth(@Body() body: CONSUMER.GoogleSignin) {
    return this.service.googleOAuth(removeNil(body));
  }

  @PublicEndpoint()
  @Post(`google-login-gpt`)
  @HttpCode(HttpStatus.OK)
  async googleLoginGPT(@Res({ passthrough: true }) res, @Body() body: GoogleOAuthBody) {
    const result = await this.googleOAuthServiceGPT.googleLoginGPT(removeNil(body));
    const { accessToken, refreshToken } = await this.service.issueTokensForConsumer(result.consumer.id);
    this.setAuthCookies(res, accessToken, refreshToken);
    return { ...result.consumer, accessToken, refreshToken };
  }

  @PublicEndpoint()
  @Post(`refresh-access`)
  @ApiOperation({ operationId: `refresh_access` })
  @ApiBody({ schema: { type: `object`, properties: { refreshToken: { type: `string` } } } })
  @ApiOkResponse({ type: CONSUMER.LoginResponse })
  refreshAccess(@Body(`refreshToken`) refreshToken: string) {
    return this.service.refreshAccess(refreshToken);
  }

  @PublicEndpoint()
  @Post(`change-password`)
  checkEmailAndSendRecoveryLink(@Headers() headers: IncomingHttpHeaders, @Body() body: { email: string }) {
    const referer = headers.origin || headers.referer;
    if (!referer) throw new InternalServerErrorException(`Unexpected referer(origin): ${referer}`);
    return this.service.checkEmailAndSendRecoveryLink(removeNil(body), referer);
  }

  @PublicEndpoint()
  @Patch(`change-password/:token`)
  changePassword(@Param() param: CONSUMER.ChangePasswordParam, @Body() body: CONSUMER.ChangePasswordBody) {
    return this.service.changePassword(removeNil(body), removeNil(param));
  }

  @Get(`me`)
  me(@Identity() consumer: ConsumerModel) {
    return consumer;
  }

  @PublicEndpoint()
  @Post(`signup`)
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
    if (!referer) throw new InternalServerErrorException(`Unexpected referer(origin): ${referer}`);
    this.service.completeProfileCreationAndSendVerificationEmail(consumerId, referer);
    return `success`;
  }

  @PublicEndpoint()
  @Get(`signup/verification`)
  signupVerification(@Query(`referer`) referer: string, @Query(`token`) token: string, @Res() res: express.Response) {
    if (!referer) throw new InternalServerErrorException(`Unexpected referer(origin): ${referer}`);
    return this.service.signupVerification(token, res, referer);
  }
}
