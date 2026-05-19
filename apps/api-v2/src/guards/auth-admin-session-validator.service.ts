import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import { type IIdentity } from '../common';
import { GuardMessage } from './auth-guard-boundary';
import { AuthIdentityRepository } from './auth-identity.repository';
import { validateSessionTokenHash } from './auth-session-token-hash.validator';
import { AuthSessionRepository } from './auth-session.repository';
import { type IJwtTokenPayload } from '../dtos/consumer';

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
    validateSessionTokenHash({
      logger: this.logger,
      session: await this.authSessionRepository.findActiveAdminSession(verified.sid, identityId),
      accessToken,
      logPrefix: `admin`,
    });

    const admin = await this.authIdentityRepository.findActiveAdminById(identityId);
    if (admin == null) {
      this.logger.warn(`AuthGuard: no admin identity for verified identityId`);
      throw new UnauthorizedException(GuardMessage.NO_IDENTITY_RECORD);
    }

    return { identity: admin, identityType: admin.type, sessionId: verified.sid };
  }
}
