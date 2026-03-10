import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import express from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { resolveAccessTokenCookieKeysForPath } from '@remoola/api-types';

import { JWT_ACCESS_SECRET } from '../envs';

function cookieExtractorByPath(req: express.Request): string | null {
  const path = req?.path ?? req?.url?.split(`?`)[0] ?? ``;
  for (const key of resolveAccessTokenCookieKeysForPath(path)) {
    const value = req?.cookies?.[key];
    if (value) return value;
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, `jwt`) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractorByPath, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      ignoreExpiration: false,
      secretOrKey: JWT_ACCESS_SECRET,
    });
  }

  validate(payload: { sub: string; email?: string; typ?: string }): { id: string; email?: string } | null {
    // Reject non-access tokens (e.g. refresh tokens with typ:'refresh') as a defence-in-depth measure.
    // The global AuthGuard runs first and enforces cookie-only auth; this check closes the gap
    // for any path where JwtAuthGuard is used without the global guard.
    if (payload.typ !== undefined && payload.typ !== `access`) return null;
    return { id: payload.sub, email: payload.email };
  }
}
