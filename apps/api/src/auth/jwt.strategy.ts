import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import express from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { resolveAccessTokenCookieKeysForPath } from '@remoola/api-types';

import { envs } from '../envs';
import { OriginResolverService } from '../shared/origin-resolver.service';

const originResolver = new OriginResolverService();

function cookieExtractorByPath(req: express.Request): string | null {
  const path = req?.path ?? req?.url?.split(`?`)[0] ?? ``;
  const consumerScope =
    originResolver.resolveConsumerRequestScope?.(req?.headers?.origin, req?.headers?.referer) ??
    originResolver.resolveConsumerRequestAppScope?.(req?.headers?.origin, req?.headers?.referer);
  for (const key of resolveAccessTokenCookieKeysForPath(path, consumerScope ?? `consumer`)) {
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
    // The app uses cookie-first auth; JwtAuthGuard should not widen that boundary.
    if (payload.typ !== undefined && payload.typ !== `access`) return null;
    return { id: payload.sub, email: payload.email };
  }
}
