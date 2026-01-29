import { CallHandler, ExecutionContext, Injectable, NestInterceptor, UnauthorizedException } from '@nestjs/common';
import express from 'express';
import { catchError, from, lastValueFrom } from 'rxjs';

import { JWT_ACCESS_TTL } from '../../envs';
import { ACCESS_TOKEN_COOKIE_KEY } from '../../shared-common';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtRefreshInterceptor implements NestInterceptor {
  constructor(private readonly auth: AuthService) {}

  intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest<express.Request>();
    const res = ctx.switchToHttp().getResponse<express.Response>();
    const refreshToken = req.cookies?.refresh_token;

    return next.handle().pipe(
      catchError(async (err) => {
        const isJwtError =
          err?.name === `JsonWebTokenError` || err?.name === `TokenExpiredError` || err?.message?.includes?.(`jwt`);

        if (!isJwtError) throw err;
        if (!refreshToken) throw new UnauthorizedException(`Missing refresh token`);

        try {
          const { accessToken, ...identity } = await this.auth.refresh(refreshToken);

          res.cookie(ACCESS_TOKEN_COOKIE_KEY, accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === `production`,
            sameSite: `strict`,
            path: `/`,
            maxAge: JWT_ACCESS_TTL,
          });

          req.user = identity;

          return lastValueFrom(from(next.handle()));
        } catch {
          throw new UnauthorizedException(`Session expired, please log in again`);
        }
      }),
    );
  }
}
