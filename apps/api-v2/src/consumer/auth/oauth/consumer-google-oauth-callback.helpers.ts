import { BadRequestException } from '@nestjs/common';

import { type ConsumerAppScope } from '@remoola/api-types';

import { type OriginResolverService } from '../../../shared/origin-resolver.service';
import { getApiOAuthStateCookieKey } from '../../../shared-common';
import { type ConsumerAuthControllerSupportService } from '../consumer-auth-controller-support.service';

import type express from 'express';

type OAuthStatePreview = {
  appScope?: string | null;
};

type OAuthStateStoreReader = {
  read(state: string): Promise<OAuthStatePreview | null>;
};

type BuildGoogleOAuthCallbackHelpersParams = {
  req: express.Request;
  response: express.Response;
  state?: string;
  stateRecordPreview: OAuthStatePreview | null;
  originResolver: OriginResolverService;
  oauthStateStore: OAuthStateStoreReader;
  supportService: ConsumerAuthControllerSupportService;
  oauthStateTtlMs: number;
};

export function buildGoogleOAuthCallbackHelpers({
  req,
  response,
  state,
  stateRecordPreview,
  originResolver,
  oauthStateStore,
  supportService,
  oauthStateTtlMs,
}: BuildGoogleOAuthCallbackHelpersParams) {
  const previewAppScope = originResolver.validateConsumerAppScope(stateRecordPreview?.appScope);

  const clearStateCookie = (consumerScope?: string | null) => {
    const validatedAppScope = originResolver.validateConsumerAppScope(consumerScope) ?? previewAppScope;
    if (!validatedAppScope) {
      return;
    }
    response.clearCookie(
      getApiOAuthStateCookieKey(req, validatedAppScope),
      supportService.getOAuthClearCookieOptions(req, oauthStateTtlMs),
    );
  };

  const failureRedirect = (reason: string, appScope?: string | null) => {
    const validatedAppScope = originResolver.validateConsumerAppScope(appScope) ?? previewAppScope;
    if (!validatedAppScope) {
      throw new BadRequestException(`Invalid OAuth state`);
    }
    clearStateCookie(validatedAppScope);
    return response.redirect(supportService.buildConsumerLoginRedirect(reason, validatedAppScope));
  };

  const consumeStateAppScope = async (maybeState?: string): Promise<ConsumerAppScope | undefined> => {
    if (!maybeState) return undefined;
    const record = maybeState === state ? stateRecordPreview : await oauthStateStore.read(maybeState);
    return originResolver.validateConsumerAppScope(record?.appScope);
  };

  return {
    clearStateCookie,
    failureRedirect,
    consumeStateAppScope,
  };
}
