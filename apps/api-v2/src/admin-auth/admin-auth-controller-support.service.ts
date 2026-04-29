import { Injectable, UnauthorizedException } from '@nestjs/common';
import express from 'express';

import { oauthCrypto } from '@remoola/security-utils';

import { envs } from '../envs';
import { OriginResolverService } from '../shared/origin-resolver.service';
import {
  getApiAdminAccessTokenCookieKey,
  getApiAdminAuthCookieClearOptions,
  getApiAdminAuthCookieOptions,
  getApiAdminCsrfCookieClearOptions,
  getApiAdminCsrfCookieOptions,
  getApiAdminCsrfTokenCookieKey,
  getApiAdminCsrfTokenCookieKeysForRead,
  getApiAdminRefreshTokenCookieKey,
  getApiAdminRefreshTokenCookieKeysForRead,
} from '../shared-common';

@Injectable()
export class AdminAuthControllerSupportService {
  constructor(private readonly originResolver: OriginResolverService) {}

  getRefreshTokenFromRequest(req: express.Request): string | undefined {
    return getApiAdminRefreshTokenCookieKeysForRead()
      .map((key) => req.cookies?.[key])
      .find((value): value is string => typeof value === `string` && value.length > 0);
  }

  setAuthCookies(res: express.Response, accessToken: string, refreshToken: string): void {
    const common = getApiAdminAuthCookieOptions();
    res.cookie(getApiAdminAccessTokenCookieKey(), accessToken, { ...common, maxAge: envs.JWT_ACCESS_TOKEN_EXPIRES_IN });
    res.cookie(getApiAdminRefreshTokenCookieKey(), refreshToken, {
      ...common,
      maxAge: envs.JWT_REFRESH_TOKEN_EXPIRES_IN,
    });
    res.cookie(getApiAdminCsrfTokenCookieKey(), oauthCrypto.generateOAuthState(), getApiAdminCsrfCookieOptions());
  }

  clearAuthCookies(res: express.Response): void {
    const authCookieOptions = getApiAdminAuthCookieClearOptions();
    const csrfCookieOptions = getApiAdminCsrfCookieClearOptions();
    res.clearCookie(getApiAdminAccessTokenCookieKey(), authCookieOptions);
    res.clearCookie(getApiAdminRefreshTokenCookieKey(), authCookieOptions);
    res.clearCookie(getApiAdminCsrfTokenCookieKey(), csrfCookieOptions);
  }

  ensureCsrf(req: express.Request): void {
    if (!this.originResolver.resolveAdminRequestOrigin(req.headers.origin, req.headers.referer)) {
      throw new UnauthorizedException(`Invalid request origin`);
    }
    const csrfHeader = req.headers[`x-csrf-token`];
    const csrfCookie = getApiAdminCsrfTokenCookieKeysForRead()
      .map((key) => req.cookies?.[key])
      .find((value): value is string => typeof value === `string` && value.length > 0);
    const csrfHeaderValue =
      typeof csrfHeader === `string` ? csrfHeader : Array.isArray(csrfHeader) ? csrfHeader[0] : undefined;
    if (!csrfHeaderValue || !csrfCookie || csrfCookie !== csrfHeaderValue) {
      throw new UnauthorizedException(`Invalid CSRF token`);
    }
  }

  resolveAdminOrigin(req: express.Request): string {
    const resolvedOrigin = this.originResolver.resolveAdminRequestOrigin(req.headers.origin, req.headers.referer);
    if (!resolvedOrigin) {
      throw new UnauthorizedException(`Invalid request origin`);
    }
    return resolvedOrigin;
  }

  resolveRequestMeta(req: express.Request): { ipAddress: string | null; userAgent: string | null } {
    const ipAddress = req.ip ?? req.headers[`x-forwarded-for`];
    const userAgent = req.headers[`user-agent`] ?? null;
    return {
      ipAddress: typeof ipAddress === `string` ? ipAddress : Array.isArray(ipAddress) ? ipAddress[0] : null,
      userAgent: typeof userAgent === `string` ? userAgent : null,
    };
  }
}
