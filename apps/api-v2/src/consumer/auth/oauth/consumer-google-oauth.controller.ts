import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import express from 'express';

import {
  consumerGoogleSignupSessionResponseSchema,
  consumerOAuthCompleteResponseSchema,
  type ConsumerAppScope,
  type ConsumerGoogleSignupSessionResponse,
  type ConsumerOAuthCompleteResponse,
} from '@remoola/api-types';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerAuthService } from '../auth.service';
import { ConsumerAuthControllerSupportService } from '../consumer-auth-controller-support.service';
import { GoogleSignupSessionResponse, HandoffTokenRequest, OAuthCompleteResponse } from '../dto';
import { CONSUMER_GOOGLE_OAUTH_POLICY, ConsumerGoogleOAuthFlowService } from './consumer-google-oauth-flow.service';
import { GoogleOAuthService } from './google-oauth.service';
import { OAuthStateStoreService } from './oauth-state-store.service';
import { PublicEndpoint, TrackConsumerAction } from '../../../common';
import { envs } from '../../../envs';
import { OriginResolverService } from '../../../shared/origin-resolver.service';
import { getApiOAuthStateCookieKey } from '../../../shared-common';
import { toConsumerWireContract } from '../../consumer-wire-contract';

@ApiTags(`Consumer: Auth`)
@Controller(`consumer/auth`)
export class ConsumerGoogleOAuthController {
  private readonly logger = new Logger(ConsumerGoogleOAuthController.name);
  private readonly oauthStateTtlMs = CONSUMER_GOOGLE_OAUTH_POLICY.oauthStateTtlMs;
  private readonly oauthLoginHandoffTtlMs = CONSUMER_GOOGLE_OAUTH_POLICY.oauthLoginHandoffTtlMs;
  private readonly googleSignupSessionTtlMs = CONSUMER_GOOGLE_OAUTH_POLICY.googleSignupSessionTtlMs;
  private readonly maxOAuthNextPathLength = CONSUMER_GOOGLE_OAUTH_POLICY.maxNextPathLength;

  constructor(
    private readonly service: ConsumerAuthService,
    private readonly flowService: ConsumerGoogleOAuthFlowService,
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly oauthStateStore: OAuthStateStoreService,
    private readonly originResolver: OriginResolverService,
    private readonly supportService: ConsumerAuthControllerSupportService,
  ) {}

  private getOAuthStateCookieFromRequest(req: express.Request, appScope: ConsumerAppScope): string | undefined {
    return this.supportService.getOAuthStateCookieFromRequest(req, appScope);
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

  private isOAuthStateCookieFallbackAllowedInEnv(): boolean {
    return this.supportService.isOAuthStateCookieFallbackAllowedInEnv();
  }

  private requireStoredConsumerAppScopeMatchesRequest(
    req: express.Request,
    storedAppScope?: string | null,
  ): ConsumerAppScope {
    return this.supportService.requireStoredConsumerAppScopeMatchesRequest(req, storedAppScope);
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
    const start = await this.flowService.start(req, {
      accountType,
      appScope,
      contractorKind,
      next,
      signupPath,
    });

    response.cookie(getApiOAuthStateCookieKey(req, start.consumerScope), start.stateToken, start.oauthCookieOptions);
    return response.redirect(start.authUrl);
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
  @ApiOkResponse({ type: GoogleSignupSessionResponse })
  async googleSignupSession(
    @Req() req: express.Request,
    @Query(`appScope`) appScope?: string,
  ): Promise<ConsumerGoogleSignupSessionResponse> {
    return toConsumerWireContract(
      consumerGoogleSignupSessionResponseSchema,
      await this.flowService.getSignupSession(req, appScope),
    );
  }

  @PublicEndpoint()
  @TrackConsumerAction({ action: `consumer.auth.google_signup_session_establish`, resource: `auth` })
  @Post(`google/signup-session/establish`)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: HandoffTokenRequest })
  @ApiOkResponse({ type: GoogleSignupSessionResponse })
  async establishGoogleSignupSession(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res,
    @Body() body: HandoffTokenRequest,
    @Query(`appScope`) appScope?: string,
  ): Promise<ConsumerGoogleSignupSessionResponse> {
    const result = await this.flowService.establishSignupSession(req, body.handoffToken, appScope);
    this.supportService.setGoogleSignupSessionCookie(
      req,
      res,
      result.signupSessionToken,
      result.claimedAppScope,
      this.googleSignupSessionTtlMs,
    );
    return toConsumerWireContract(consumerGoogleSignupSessionResponseSchema, result.response);
  }

  @PublicEndpoint()
  @TrackConsumerAction({ action: `consumer.auth.oauth_complete`, resource: `auth` })
  @Post(`oauth/complete`)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: HandoffTokenRequest })
  @ApiOkResponse({ type: OAuthCompleteResponse })
  async oauthComplete(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res,
    @Body() body: HandoffTokenRequest,
    @Query(`appScope`) appScope?: string,
  ): Promise<ConsumerOAuthCompleteResponse> {
    const result = await this.flowService.completeOAuth(req, body.handoffToken, appScope);
    this.supportService.setAuthCookies(req, res, result.accessToken, result.refreshToken, result.claimedAppScope);
    return toConsumerWireContract(consumerOAuthCompleteResponseSchema, { ok: true, next: result.next });
  }
}
