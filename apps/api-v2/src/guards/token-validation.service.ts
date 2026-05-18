import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { type Request as TExpressRequest } from 'express';

import { isAdminApiPath } from '@remoola/api-types';

import { AuthAdminSessionValidatorService } from './auth-admin-session-validator.service';
import { AuthConsumerSessionValidatorService } from './auth-consumer-session-validator.service';
import { CONSUMER_API_PATH_PREFIX, GuardMessage } from './auth-guard-boundary';
import { AuthRequestContextService } from './auth-request-context.service';
import { AuthTokenVerifierService } from './auth-token-verifier.service';
import { type IIdentity } from '../common';

export type TokenValidationResult = {
  identity: IIdentity;
  identityType: string;
  sessionId?: string;
};

@Injectable()
export class TokenValidationService {
  private readonly logger = new Logger(TokenValidationService.name);

  constructor(
    private readonly requestContextService: AuthRequestContextService,
    private readonly tokenVerifier: AuthTokenVerifierService,
    private readonly consumerSessionValidator: AuthConsumerSessionValidatorService,
    private readonly adminSessionValidator: AuthAdminSessionValidatorService,
  ) {}

  async validate(request: TExpressRequest): Promise<TokenValidationResult> {
    const requestContext = this.requestContextService.getContext(request);
    const { payload: verified, identityId } = this.tokenVerifier.verify(requestContext.accessToken);

    if (verified.scope === `admin` && requestContext.path.startsWith(CONSUMER_API_PATH_PREFIX)) {
      this.logger.warn(`AuthGuard: admin token used on consumer path`);
      throw new ForbiddenException(GuardMessage.ONLY_FOR_CONSUMERS);
    }
    if (verified.scope === `consumer` && isAdminApiPath(requestContext.path)) {
      this.logger.warn(`AuthGuard: consumer token used on admin path`);
      throw new ForbiddenException(GuardMessage.ONLY_FOR_ADMINS);
    }

    return verified.scope === `admin`
      ? this.adminSessionValidator.validate({
          accessToken: requestContext.accessToken,
          verified,
          identityId,
        })
      : this.consumerSessionValidator.validate({
          accessToken: requestContext.accessToken,
          verified,
          identityId,
          requestAppScope: requestContext.consumerScope,
        });
  }
}
