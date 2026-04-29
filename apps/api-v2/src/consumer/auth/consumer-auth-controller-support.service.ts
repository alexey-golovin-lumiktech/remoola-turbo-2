import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';

import { CONSUMER_APP_SCOPE_HEADER, type ConsumerAppScope, getCookieClearOptions } from '@remoola/api-types';
import { oauthCrypto } from '@remoola/security-utils';

import { envs } from '../../envs';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import {
  getApiConsumerAccessTokenCookieKey,
  getApiConsumerAuthCookieClearOptions,
  getApiConsumerAuthCookieOptions,
  getApiConsumerCsrfCookieClearOptions,
  getApiConsumerCsrfCookieOptions,
  getApiConsumerCsrfTokenCookieKey,
  getApiConsumerCsrfTokenCookieKeysForRead,
  getApiConsumerGoogleSignupSessionCookieClearOptions,
  getApiConsumerGoogleSignupSessionCookieKey,
  getApiConsumerGoogleSignupSessionCookieKeysForRead,
  getApiConsumerGoogleSignupSessionCookieOptions,
  getApiConsumerRefreshTokenCookieKey,
  getApiConsumerRefreshTokenCookieKeysForRead,
  getApiOAuthStateCookieKeysForRead,
  getApiOAuthStateCookieOptions,
} from '../../shared-common';

import type express from 'express';

@Injectable()
export class ConsumerAuthControllerSupportService {
  constructor(private readonly originResolver: OriginResolverService) {}

  requireConsumerAppScope(appScope?: string | null): ConsumerAppScope {
    const validatedAppScope = this.originResolver.validateConsumerAppScope(appScope);
    if (!validatedAppScope) {
      throw new BadRequestException(`Invalid app scope`);
    }
    return validatedAppScope;
  }

  requireRequestConsumerAppScope(req: express.Request): ConsumerAppScope {
    const requestAppScope = this.originResolver.validateConsumerAppScopeHeader(req.headers[CONSUMER_APP_SCOPE_HEADER]);
    if (!requestAppScope) {
      throw new UnauthorizedException(`Invalid app scope`);
    }
    return requestAppScope;
  }

  requireClaimedConsumerAppScope(req: express.Request, appScope?: string | null): ConsumerAppScope {
    const validatedAppScope = this.requireConsumerAppScope(appScope);
    const requestAppScope = this.requireRequestConsumerAppScope(req);
    if (requestAppScope !== validatedAppScope) {
      throw new UnauthorizedException(`Invalid app scope`);
    }
    return validatedAppScope;
  }

  requireStoredConsumerAppScopeMatchesRequest(req: express.Request, storedAppScope?: string | null): ConsumerAppScope {
    const requestAppScope = this.requireRequestConsumerAppScope(req);
    const validatedStoredScope = this.requireConsumerAppScope(storedAppScope);
    if (requestAppScope !== validatedStoredScope) {
      throw new UnauthorizedException(`Invalid app scope`);
    }
    return validatedStoredScope;
  }

  resolveConfiguredConsumerOrigin(scope: ConsumerAppScope): string {
    const origin = this.originResolver.resolveConsumerOriginByScope(scope);
    if (!origin) {
      throw new BadRequestException(`Invalid app scope`);
    }
    return origin;
  }

  getOAuthStateCookieFromRequest(req: express.Request, appScope: ConsumerAppScope): string | undefined {
    return getApiOAuthStateCookieKeysForRead(appScope)
      .map((key) => req.cookies?.[key] ?? req.signedCookies?.[key])
      .find((value): value is string => typeof value === `string` && value.length > 0);
  }

  getRefreshTokenFromRequest(req: express.Request, consumerScope: ConsumerAppScope): string | undefined {
    return getApiConsumerRefreshTokenCookieKeysForRead(consumerScope)
      .map((key) => req.cookies?.[key])
      .find((value): value is string => typeof value === `string` && value.length > 0);
  }

  getGoogleSignupSessionTokenFromRequest(req: express.Request, consumerScope: ConsumerAppScope): string | undefined {
    return getApiConsumerGoogleSignupSessionCookieKeysForRead(consumerScope)
      .map((key) => req.cookies?.[key])
      .find((value): value is string => typeof value === `string` && value.length > 0);
  }

  setAuthCookies(
    req: express.Request,
    res: express.Response,
    accessToken: string,
    refreshToken: string,
    consumerScope: ConsumerAppScope,
  ) {
    const common = getApiConsumerAuthCookieOptions(req);
    res.cookie(getApiConsumerAccessTokenCookieKey(req, consumerScope), accessToken, {
      ...common,
      maxAge: envs.JWT_ACCESS_TOKEN_EXPIRES_IN,
    });
    res.cookie(getApiConsumerRefreshTokenCookieKey(req, consumerScope), refreshToken, {
      ...common,
      maxAge: envs.JWT_REFRESH_TOKEN_EXPIRES_IN,
    });
    res.cookie(
      getApiConsumerCsrfTokenCookieKey(req, consumerScope),
      oauthCrypto.generateOAuthState(),
      getApiConsumerCsrfCookieOptions(req),
    );
  }

  clearAuthCookies(req: express.Request, res: express.Response, consumerScope: ConsumerAppScope) {
    const authCookieOptions = getApiConsumerAuthCookieClearOptions(req);
    const csrfCookieOptions = getApiConsumerCsrfCookieClearOptions(req);
    res.clearCookie(getApiConsumerAccessTokenCookieKey(req, consumerScope), authCookieOptions);
    res.clearCookie(getApiConsumerRefreshTokenCookieKey(req, consumerScope), authCookieOptions);
    res.clearCookie(getApiConsumerCsrfTokenCookieKey(req, consumerScope), csrfCookieOptions);
  }

  setGoogleSignupSessionCookie(
    req: express.Request,
    res: express.Response,
    token: string,
    consumerScope: ConsumerAppScope,
    googleSignupSessionTtlMs: number,
  ) {
    res.cookie(getApiConsumerGoogleSignupSessionCookieKey(req, consumerScope), token, {
      ...getApiConsumerGoogleSignupSessionCookieOptions(req),
      maxAge: googleSignupSessionTtlMs,
    });
  }

  clearGoogleSignupSessionCookie(req: express.Request, res: express.Response, consumerScope: ConsumerAppScope) {
    res.clearCookie(
      getApiConsumerGoogleSignupSessionCookieKey(req, consumerScope),
      getApiConsumerGoogleSignupSessionCookieClearOptions(req),
    );
  }

  getOAuthCookieOptions(req?: express.Request, oauthStateTtlMs?: number) {
    return {
      ...getApiOAuthStateCookieOptions(req),
      maxAge: oauthStateTtlMs,
    };
  }

  getOAuthClearCookieOptions(req?: express.Request, oauthStateTtlMs?: number) {
    return getCookieClearOptions(this.getOAuthCookieOptions(req, oauthStateTtlMs));
  }

  normalizeNextPath(next: string | undefined, maxOAuthNextPathLength: number) {
    if (!next) return `/dashboard`;
    if (next.startsWith(`/`)) {
      if (next.startsWith(`//`)) return `/dashboard`;
      if (next.length > maxOAuthNextPathLength) return `/dashboard`;
      return next;
    }

    try {
      const url = new URL(next);
      if (this.originResolver.getConsumerAllowedOrigins().has(this.originResolver.normalizeOrigin(url.origin))) {
        const normalized = `${url.pathname}${url.search}${url.hash}`;
        if (normalized.length > maxOAuthNextPathLength) return `/dashboard`;
        return normalized;
      }
    } catch {
      // Default fallback is intentional for invalid external next URLs.
    }

    return `/dashboard`;
  }

  getSignupEntryPathFromNext(next: string | undefined, maxOAuthNextPathLength: number) {
    const normalized = this.normalizeNextPath(next, maxOAuthNextPathLength);
    const pathname = normalized.startsWith(`/`) ? normalized.split(/[?#]/, 1)[0] : `/dashboard`;
    return pathname === `/signup` ? `/signup` : `/signup/start`;
  }

  normalizeSignupCompletionPath(next: string | undefined, maxOAuthNextPathLength: number) {
    const normalized = this.normalizeNextPath(next, maxOAuthNextPathLength);
    return normalized === `/signup` || normalized.startsWith(`/signup?`) ? `/dashboard` : normalized;
  }

  isOAuthStateCookieFallbackAllowedInEnv(): boolean {
    return envs.NODE_ENV === envs.ENVIRONMENT.DEVELOPMENT || envs.NODE_ENV === envs.ENVIRONMENT.TEST;
  }

  ensureCsrf(req: express.Request) {
    const consumerScope = this.requireRequestConsumerAppScope(req);
    const csrfHeader = req.headers[`x-csrf-token`];
    const csrfCookie = getApiConsumerCsrfTokenCookieKeysForRead(consumerScope)
      .map((key) => req.cookies?.[key])
      .find((value): value is string => typeof value === `string` && value.length > 0);
    const csrfHeaderValue =
      typeof csrfHeader === `string` ? csrfHeader : Array.isArray(csrfHeader) ? csrfHeader[0] : undefined;
    if (!csrfHeaderValue || !csrfCookie || csrfCookie !== csrfHeaderValue) {
      throw new UnauthorizedException(`Invalid CSRF token`);
    }
  }

  buildConsumerRedirect(appScope: ConsumerAppScope, nextPath: string, extraParams?: Record<string, string>) {
    const origin = this.resolveConfiguredConsumerOrigin(appScope);
    const url = new URL(`/auth/callback`, origin);
    url.searchParams.set(`next`, nextPath);
    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        if (value) url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

  buildConsumerLoginRedirect(errorCode: string, appScope: ConsumerAppScope) {
    const origin = this.resolveConfiguredConsumerOrigin(appScope);
    const url = new URL(`/login`, origin);
    url.searchParams.set(`oauth`, `google`);
    url.searchParams.set(`error`, errorCode);
    return url.toString();
  }

  buildConsumerSignupRedirect(
    appScope: ConsumerAppScope,
    googleSignupHandoff: string,
    signupEntryPath?: string,
    accountType?: string,
    contractorKind?: string,
  ) {
    const origin = this.resolveConfiguredConsumerOrigin(appScope);
    const signupRedirectPath = signupEntryPath === `/signup` ? `/signup` : `/signup/start`;
    const url = new URL(signupRedirectPath, origin);
    url.searchParams.set(`googleSignupHandoff`, googleSignupHandoff);
    if (accountType) url.searchParams.set(`accountType`, accountType);
    if (contractorKind) url.searchParams.set(`contractorKind`, contractorKind);
    return url.toString();
  }
}
