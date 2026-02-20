import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import express from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JWT_ACCESS_SECRET } from '../envs';
import { ADMIN_ACCESS_TOKEN_COOKIE_KEY, CONSUMER_ACCESS_TOKEN_COOKIE_KEY } from '../shared-common';

const ADMIN_API_PATH_PREFIX = `/api/admin/`;
const CONSUMER_API_PATH_PREFIX = `/api/consumer/`;

function cookieExtractorByPath(req: express.Request): string | null {
  const path = req?.path ?? req?.url?.split(`?`)[0] ?? ``;
  const key = path.startsWith(ADMIN_API_PATH_PREFIX)
    ? ADMIN_ACCESS_TOKEN_COOKIE_KEY
    : path.startsWith(CONSUMER_API_PATH_PREFIX)
      ? CONSUMER_ACCESS_TOKEN_COOKIE_KEY
      : CONSUMER_ACCESS_TOKEN_COOKIE_KEY;
  return req?.cookies?.[key] ?? null;
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

  validate(payload: any) {
    return { id: payload.sub, email: payload.email };
  }
}
