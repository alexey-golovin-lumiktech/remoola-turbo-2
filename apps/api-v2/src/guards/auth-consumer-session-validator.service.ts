import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import { type ConsumerAppScope } from '@remoola/api-types';
import { oauthCrypto } from '@remoola/security-utils';
import { errorCodes } from '@remoola/shared-constants';

import { type IIdentity } from '../common';
import { GuardMessage } from './auth-guard-boundary';
import { AuthIdentityRepository } from './auth-identity.repository';
import { AuthSessionRepository } from './auth-session.repository';
import { type IJwtTokenPayload } from '../dtos/consumer';
import { OriginResolverService } from '../shared/origin-resolver.service';
import { secureCompare } from '../shared-common';

@Injectable()
export class AuthConsumerSessionValidatorService {
  private readonly logger = new Logger(AuthConsumerSessionValidatorService.name);

  constructor(
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly authIdentityRepository: AuthIdentityRepository,
    private readonly originResolver: OriginResolverService,
  ) {}

  async validate(params: {
    accessToken: string;
    verified: IJwtTokenPayload;
    identityId: string;
    requestAppScope?: ConsumerAppScope;
  }): Promise<{ identity: IIdentity; identityType: `consumer`; sessionId: string }> {
    const { accessToken, verified, identityId, requestAppScope } = params;
    const tokenAppScope = this.originResolver.validateConsumerAppScope(verified.appScope);
    if (!requestAppScope || !tokenAppScope || tokenAppScope !== requestAppScope) {
      this.logger.warn(`AuthGuard: consumer access token app scope mismatch`);
      throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
    }
    if (!verified.sid) {
      this.logger.warn(`AuthGuard: consumer access token missing sid`);
      throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
    }
    const session = await this.authSessionRepository.findActiveConsumerSession(
      verified.sid,
      identityId,
      requestAppScope,
    );
    if (session == null || session.expiresAt < new Date()) {
      this.logger.warn(`AuthGuard: consumer session not found or expired`);
      throw new UnauthorizedException(GuardMessage.NO_IDENTITY_RECORD);
    }
    if (session.appScope !== requestAppScope) {
      this.logger.warn(`AuthGuard: consumer session app scope mismatch`);
      throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
    }
    if (!secureCompare(session.accessTokenHash, oauthCrypto.hashOAuthState(accessToken))) {
      this.logger.warn(`AuthGuard: consumer access token mismatch with stored value`);
      throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
    }

    const consumer = await this.authIdentityRepository.findConsumerById(identityId);
    if (consumer == null) {
      this.logger.warn(`AuthGuard: no consumer identity for verified identityId`);
      throw new UnauthorizedException(GuardMessage.NO_IDENTITY_RECORD);
    }
    if (consumer.suspendedAt != null) {
      this.logger.warn(`AuthGuard: suspended consumer attempted consumer path`);
      throw new ForbiddenException(errorCodes.ACCOUNT_SUSPENDED);
    }

    return { identity: consumer, identityType: `consumer`, sessionId: verified.sid };
  }
}
