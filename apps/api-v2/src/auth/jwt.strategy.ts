import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import express from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { CONSUMER_APP_SCOPE_HEADER } from '@remoola/api-types';

import { envs } from '../envs';
import { OriginResolverService } from '../shared/origin-resolver.service';
import { getApiAdminAccessTokenCookieKeysForRead, getApiConsumerAccessTokenCookieKeysForRead } from '../shared-common';

const CONSUMER_API_PATH_PREFIX = `/api/consumer/`;
const ADMIN_API_PATH_PREFIX = `/api/admin/`;
const originResolver = new OriginResolverService();

function getAccessTokenCookieKeysForPath(
  path: string,
  consumerScope?: Parameters<typeof getApiConsumerAccessTokenCookieKeysForRead>[0],
): readonly string[] {
  if (path.startsWith(CONSUMER_API_PATH_PREFIX)) {
    if (!consumerScope) {
      return [];
    }
    return getApiConsumerAccessTokenCookieKeysForRead(consumerScope);
  }
  if (path.startsWith(ADMIN_API_PATH_PREFIX)) {
    return getApiAdminAccessTokenCookieKeysForRead();
  }
  return getApiConsumerAccessTokenCookieKeysForRead(consumerScope);
}

function cookieExtractorByPath(req: express.Request): string | null {
  const path = req?.path ?? req?.url?.split(`?`)[0] ?? ``;
  const consumerScope = path.startsWith(CONSUMER_API_PATH_PREFIX)
    ? originResolver.validateConsumerAppScopeHeader(req?.headers?.[CONSUMER_APP_SCOPE_HEADER])
    : undefined;
  for (const key of getAccessTokenCookieKeysForPath(path, consumerScope)) {
    const value = req?.cookies?.[key];
    if (value) return value;
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, `jwt`) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractorByPath]),
      ignoreExpiration: false,
      secretOrKey: envs.JWT_ACCESS_SECRET,
    });
  }

  validate(payload: { sub: string; email?: string; typ?: string }): { id: string; email?: string } | null {
    // Reject non-access tokens (e.g. refresh tokens with typ:'refresh') as a defence-in-depth measure.
    // The app uses cookie-first auth end-to-end; JwtAuthGuard should never widen that boundary.
    if (payload.typ !== undefined && payload.typ !== `access`) return null;
    return { id: payload.sub, email: payload.email };
  }
}
