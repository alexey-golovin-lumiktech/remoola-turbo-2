import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import { oauthCrypto } from '@remoola/security-utils';

import { type IIdentity } from '../common';
import { GuardMessage } from './auth-guard-boundary';
import { AuthIdentityRepository } from './auth-identity.repository';
import { AuthSessionRepository } from './auth-session.repository';
import { type IJwtTokenPayload } from '../dtos/consumer';
import { secureCompare } from '../shared-common';

@Injectable()
export class AuthAdminSessionValidatorService {
  private readonly logger = new Logger(AuthAdminSessionValidatorService.name);

  constructor(
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly authIdentityRepository: AuthIdentityRepository,
  ) {}

  async validate(params: {
    accessToken: string;
    verified: IJwtTokenPayload;
    identityId: string;
  }): Promise<{ identity: IIdentity; identityType: string; sessionId: string }> {
    const { accessToken, verified, identityId } = params;
    if (!verified.sid) {
      this.logger.warn(`AuthGuard: admin access token missing sid`);
      throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
    }
    const session = await this.authSessionRepository.findActiveAdminSession(verified.sid, identityId);
    if (session == null || session.expiresAt < new Date()) {
      this.logger.warn(`AuthGuard: admin session not found or expired`);
      throw new UnauthorizedException(GuardMessage.NO_IDENTITY_RECORD);
    }
    if (!secureCompare(session.accessTokenHash, oauthCrypto.hashOAuthState(accessToken))) {
      this.logger.warn(`AuthGuard: admin access token mismatch with stored value`);
      throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
    }

    const admin = await this.authIdentityRepository.findActiveAdminById(identityId);
    if (admin == null) {
      this.logger.warn(`AuthGuard: no admin identity for verified identityId`);
      throw new UnauthorizedException(GuardMessage.NO_IDENTITY_RECORD);
    }

    return { identity: admin, identityType: admin.type, sessionId: verified.sid };
  }
}
