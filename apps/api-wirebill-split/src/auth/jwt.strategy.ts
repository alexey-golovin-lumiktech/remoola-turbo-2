import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JWT_ACCESS_COOKIE, JWT_ACCESS_SECRET } from '../envs';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, `jwt`) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.[JWT_ACCESS_COOKIE] || null,
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
