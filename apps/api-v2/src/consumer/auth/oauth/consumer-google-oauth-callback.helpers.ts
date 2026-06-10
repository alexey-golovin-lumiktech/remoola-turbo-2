import { BadRequestException } from '@nestjs/common';

import { type ConsumerAppScope } from '@remoola/api-types';

import { type OriginResolverService } from '../../../shared/origin-resolver.service';
import { getApiOAuthStateCookieKey } from '../../../shared-common';
import { type ConsumerAuthControllerSupportService } from '../consumer-auth-controller-support.service';

import type express from 'express';

type OAuthStatePreview = {
  appScope?: string | null;
};

type OAuthCallbackStateRecord = {
  appScope: ConsumerAppScope;
  nextPath: string;
  signupEntryPath?: string | null;
  accountType?: string | null;
  contractorKind?: string | null;
};

type OAuthStateStoreReader = {
  read(state: string): Promise<OAuthStatePreview | null>;
};

type OAuthStateCookieCheckResult = {
  handled: boolean;
  warningEvent?:
    | `oauth_state_cookie_mismatch_auto_fallback_dev_or_test`
    | `oauth_state_cookie_missing_auto_fallback_dev_or_test`;
};

type BuildGoogleOAuthCallbackHelpersParams = {
  req: express.Request;
  response: express.Response;
  state?: string;
  stateRecordPreview: OAuthStatePreview | null;
  originResolver: OriginResolverService;
  oauthStateStore: OAuthStateStoreReader;
  supportService: ConsumerAuthControllerSupportService;
  maxOAuthNextPathLength: number;
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
  maxOAuthNextPathLength,
  oauthStateTtlMs,
}: BuildGoogleOAuthCallbackHelpersParams) {
  const previewAppScope = originResolver.validateConsumerAppScope(stateRecordPreview?.appScope);

  const resolveStateCookie = () =>
    previewAppScope ? supportService.getOAuthStateCookieFromRequest(req, previewAppScope) : undefined;

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

  const handleOAuthCallbackError = async (error?: string) => {
    if (!error) {
      return false;
    }
    const errorAppScope = await consumeStateAppScope(state);
    failureRedirect(`access_denied`, errorAppScope);
    return true;
  };

  const handleStateCookieMismatch = async (stateCookie?: string): Promise<OAuthStateCookieCheckResult> => {
    if (stateCookie && stateCookie !== state) {
      if (!supportService.isOAuthStateCookieFallbackAllowedInEnv()) {
        const mismatchAppScope = await consumeStateAppScope(state);
        failureRedirect(`invalid_state`, mismatchAppScope);
        return { handled: true };
      }
      return {
        handled: false,
        warningEvent: `oauth_state_cookie_mismatch_auto_fallback_dev_or_test`,
      };
    }

    if (!stateCookie) {
      if (!supportService.isOAuthStateCookieFallbackAllowedInEnv()) {
        const fallbackBlockedAppScope = await consumeStateAppScope(state);
        failureRedirect(`invalid_state`, fallbackBlockedAppScope);
        return { handled: true };
      }
      return {
        handled: false,
        warningEvent: `oauth_state_cookie_missing_auto_fallback_dev_or_test`,
      };
    }

    return { handled: false };
  };

  const normalizeCompletionNextPath = (next?: string) =>
    supportService.normalizeSignupCompletionPath(next, maxOAuthNextPathLength);

  const buildSignupRedirect = (stateRecord: OAuthCallbackStateRecord, googleSignupHandoff: string) => {
    clearStateCookie(stateRecord.appScope);
    return supportService.buildConsumerSignupRedirect(
      stateRecord.appScope,
      googleSignupHandoff,
      stateRecord.signupEntryPath ??
        supportService.getSignupEntryPathFromNext(stateRecord.nextPath, maxOAuthNextPathLength),
      stateRecord.accountType ?? undefined,
      stateRecord.contractorKind ?? undefined,
    );
  };

  const buildLoginHandoffRedirect = (params: {
    appScope: ConsumerAppScope;
    nextPath: string;
    oauthHandoff: string;
  }) => {
    clearStateCookie(params.appScope);
    return supportService.buildConsumerRedirect(params.appScope, params.nextPath, {
      oauthHandoff: params.oauthHandoff,
    });
  };

  return {
    buildLoginHandoffRedirect,
    buildSignupRedirect,
    clearStateCookie,
    failureRedirect,
    consumeStateAppScope,
    handleOAuthCallbackError,
    handleStateCookieMismatch,
    normalizeCompletionNextPath,
    resolveStateCookie,
  };
}
