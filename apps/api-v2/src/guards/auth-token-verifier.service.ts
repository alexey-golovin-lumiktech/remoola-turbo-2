import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { type IJwtTokenPayload } from '../dtos/consumer';
import { envs } from '../envs';
import { GuardMessage } from './auth-guard-boundary';

export type VerifiedAccessToken = {
  payload: IJwtTokenPayload;
  identityId: string;
};

@Injectable()
export class AuthTokenVerifierService {
  private readonly logger = new Logger(AuthTokenVerifierService.name);

  constructor(private readonly jwtService: JwtService) {}

  verify(accessToken: string): VerifiedAccessToken {
    let verified: IJwtTokenPayload;
    try {
      verified = this.jwtService.verify<IJwtTokenPayload>(accessToken, { secret: envs.JWT_ACCESS_SECRET });
    } catch {
      this.logger.warn(`AuthGuard: JWT verification failed`);
      throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
    }

    if (verified.typ !== undefined && verified.typ !== `access`) {
      this.logger.warn(`AuthGuard: token typ is not access`);
      throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
    }
    if (verified.scope !== `consumer` && verified.scope !== `admin`) {
      this.logger.warn(`AuthGuard: token missing or has invalid scope`);
      throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
    }

    const identityId = verified.identityId ?? verified.sub;
    if (!identityId) {
      this.logger.warn(`AuthGuard: token missing identityId`);
      throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
    }

    return { payload: verified, identityId };
  }
}
