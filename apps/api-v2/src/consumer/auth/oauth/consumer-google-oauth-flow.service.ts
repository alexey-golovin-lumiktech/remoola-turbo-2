import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import express from 'express';

import { $Enums } from '@remoola/database-2';
import { oauthCrypto } from '@remoola/security-utils';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerAuthService } from '../auth.service';
import { ConsumerAuthControllerSupportService } from '../consumer-auth-controller-support.service';
import { GoogleOAuthService } from './google-oauth.service';
import { OAuthStateStoreService } from './oauth-state-store.service';

export const CONSUMER_GOOGLE_OAUTH_POLICY = {
  googleSignupSessionTtlMs: 10 * 60 * 1000,
  maxNextPathLength: 512,
  oauthLoginHandoffTtlMs: 2 * 60 * 1000,
  oauthStateTtlMs: 5 * 60 * 1000,
} as const;

type GoogleSignupSessionResponse = {
  email: string;
  givenName: string | null;
  familyName: string | null;
  picture: string | null;
  accountType: string | null;
  contractorKind: string | null;
  nextPath: string | null;
  signupEntryPath: string | null;
};

function toGoogleSignupSessionResponse(payload: {
  email: string;
  givenName: string | null;
  familyName: string | null;
  picture: string | null;
  accountType: string | null;
  contractorKind: string | null;
  nextPath: string | null;
  signupEntryPath: string | null;
}): GoogleSignupSessionResponse {
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

@Injectable()
export class ConsumerGoogleOAuthFlowService {
  constructor(
    private readonly service: ConsumerAuthService,
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly oauthStateStore: OAuthStateStoreService,
    private readonly supportService: ConsumerAuthControllerSupportService,
  ) {}

  async start(
    req: express.Request,
    params: {
      appScope?: string;
      next?: string;
      signupPath?: string;
      accountType?: string;
      contractorKind?: string;
    },
  ) {
    const validatedAccountType =
      params.accountType === $Enums.AccountType.BUSINESS || params.accountType === $Enums.AccountType.CONTRACTOR
        ? params.accountType
        : undefined;
    const validatedContractorKind =
      params.contractorKind === $Enums.ContractorKind.INDIVIDUAL ||
      params.contractorKind === $Enums.ContractorKind.ENTITY
        ? params.contractorKind
        : undefined;

    const consumerScope = this.supportService.requireConsumerAppScope(params.appScope);
    const nextPath = this.supportService.normalizeNextPath(params.next, CONSUMER_GOOGLE_OAUTH_POLICY.maxNextPathLength);
    const signupEntryPath =
      params.signupPath === `/signup`
        ? `/signup`
        : this.supportService.getSignupEntryPathFromNext(params.next, CONSUMER_GOOGLE_OAUTH_POLICY.maxNextPathLength);
    const nonce = oauthCrypto.generateOAuthNonce();
    const codeVerifier = GoogleOAuthService.createCodeVerifier();
    const codeChallenge = GoogleOAuthService.createCodeChallenge(codeVerifier);
    const stateToken = this.oauthStateStore.createStateToken();

    await this.oauthStateStore.save(
      stateToken,
      {
        nonce,
        codeVerifier,
        nextPath,
        createdAt: Date.now(),
        appScope: consumerScope,
        signupEntryPath,
        accountType: validatedAccountType,
        contractorKind: validatedContractorKind,
      },
      CONSUMER_GOOGLE_OAUTH_POLICY.oauthStateTtlMs,
    );

    return {
      authUrl: this.googleOAuthService.buildAuthorizationUrl(stateToken, codeChallenge, nonce),
      consumerScope,
      oauthCookieOptions: this.supportService.getOAuthCookieOptions(req, CONSUMER_GOOGLE_OAUTH_POLICY.oauthStateTtlMs),
      stateToken,
    };
  }

  async getSignupSession(req: express.Request, appScope?: string): Promise<GoogleSignupSessionResponse> {
    const payload = await this.getGoogleSignupPayloadFromSession(req, appScope);
    if (!payload) throw new BadRequestException(errorCodes.MISSING_SIGNUP_TOKEN);
    return toGoogleSignupSessionResponse(payload);
  }

  async establishSignupSession(req: express.Request, handoffToken: string | undefined, appScope?: string) {
    const claimedAppScope = this.supportService.requireClaimedConsumerAppScope(req, appScope);
    if (!handoffToken) throw new BadRequestException(errorCodes.MISSING_SIGNUP_TOKEN);
    const payload = await this.oauthStateStore.consumeSignupHandoff(handoffToken);
    if (!payload) throw new BadRequestException(errorCodes.INVALID_GOOGLE_SIGNUP_TOKEN);
    const storedAppScope = this.supportService.requireStoredConsumerAppScopeMatchesRequest(req, payload.appScope);
    if (storedAppScope !== claimedAppScope) {
      throw new UnauthorizedException(`Invalid app scope`);
    }

    const validatedPayload = this.service.validateGoogleSignupPayload(this.service.createGoogleSignupPayload(payload));
    const signupSessionToken = this.oauthStateStore.createEphemeralToken();
    await this.oauthStateStore.saveSignupSession(
      signupSessionToken,
      payload,
      CONSUMER_GOOGLE_OAUTH_POLICY.googleSignupSessionTtlMs,
    );

    return {
      claimedAppScope,
      response: toGoogleSignupSessionResponse(validatedPayload),
      signupSessionToken,
    };
  }

  async completeOAuth(req: express.Request, handoffToken: string | undefined, appScope?: string) {
    const claimedAppScope = this.supportService.requireClaimedConsumerAppScope(req, appScope);
    if (!handoffToken) throw new BadRequestException(errorCodes.MISSING_EXCHANGE_TOKEN);
    const decoded = await this.oauthStateStore.consumeLoginHandoff(handoffToken);
    if (!decoded) throw new UnauthorizedException(errorCodes.INVALID_OAUTH_EXCHANGE_TOKEN);
    const storedAppScope = this.supportService.requireStoredConsumerAppScopeMatchesRequest(req, decoded.appScope);
    if (storedAppScope !== claimedAppScope) {
      throw new UnauthorizedException(`Invalid app scope`);
    }
    const { accessToken, refreshToken } = await this.service.issueTokensForConsumer(
      decoded.identityId,
      claimedAppScope,
    );

    return {
      accessToken,
      claimedAppScope,
      next: decoded.nextPath,
      refreshToken,
    };
  }

  private async getGoogleSignupPayloadFromSession(req: express.Request, appScope?: string | null) {
    const claimedAppScope = this.supportService.requireClaimedConsumerAppScope(req, appScope);
    const token = this.supportService.getGoogleSignupSessionTokenFromRequest(req, claimedAppScope);
    if (!token) return undefined;
    const record = await this.oauthStateStore.readSignupSession(token);
    if (!record) return undefined;
    const storedAppScope = this.supportService.requireStoredConsumerAppScopeMatchesRequest(req, record.appScope);
    if (storedAppScope !== claimedAppScope) {
      throw new UnauthorizedException(`Invalid app scope`);
    }
    return this.service.validateGoogleSignupPayload(this.service.createGoogleSignupPayload(record));
  }
}
