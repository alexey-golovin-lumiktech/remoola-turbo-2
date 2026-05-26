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
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import express from 'express';

import { type ConsumerAppScope } from '@remoola/api-types';

import { PublicEndpoint, TrackConsumerAction } from '../../../common';
import { TransformResponse } from '../../../interceptors';
import { removeNil } from '../../../shared-common';
import { ConsumerAuthService } from '../auth.service';
import { ConsumerAuthControllerSupportService } from '../consumer-auth-controller-support.service';
import { ConsumerSignup, SignupResponse } from '../dto';
import { OAuthStateStoreService } from '../oauth/oauth-state-store.service';

@ApiTags(`Consumer: Auth`)
@Controller(`consumer/auth`)
export class ConsumerSignupController {
  private readonly logger = new Logger(ConsumerSignupController.name);
  private readonly maxOAuthNextPathLength = 512;

  constructor(
    private readonly service: ConsumerAuthService,
    private readonly oauthStateStore: OAuthStateStoreService,
    private readonly supportService: ConsumerAuthControllerSupportService,
  ) {}

  private requireClaimedConsumerAppScope(req: express.Request, appScope?: string | null): ConsumerAppScope {
    return this.supportService.requireClaimedConsumerAppScope(req, appScope);
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

  private clearGoogleSignupSessionCookie(req: express.Request, res: express.Response, consumerScope: ConsumerAppScope) {
    return this.supportService.clearGoogleSignupSessionCookie(req, res, consumerScope);
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

  @PublicEndpoint()
  @TrackConsumerAction({ action: `consumer.auth.signup`, resource: `auth` })
  @Post(`signup`)
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: SignupResponse })
  @TransformResponse(SignupResponse)
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
  @Get(`signup/verification`)
  signupVerification(@Query(`token`) token: string, @Res() res: express.Response) {
    return this.service.signupVerification(token, res);
  }
}
