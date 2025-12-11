import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import express from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JWT_ACCESS_SECRET } from '../envs';
import { ACCESS_TOKEN_COOKIE_KEY } from '../shared-common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, `jwt`) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: express.Request) => req?.cookies?.[ACCESS_TOKEN_COOKIE_KEY] || null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: JWT_ACCESS_SECRET,
    });
  }

  validate(payload: any) {
    return { id: payload.sub, email: payload.email };
  }
}
