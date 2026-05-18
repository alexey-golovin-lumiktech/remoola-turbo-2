import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Request as TExpressRequest } from 'express';

import { isAdminApiPath } from '@remoola/api-types';

import { IDENTITY, type IIdentity, type IIdentityContext, IS_PUBLIC } from '../common';
import { AuthAdminSessionValidatorService } from './auth-admin-session-validator.service';
import { AuthConsumerSessionValidatorService } from './auth-consumer-session-validator.service';
import { CONSUMER_API_PATH_PREFIX, GuardMessage } from './auth-guard-boundary';
import { AuthRequestContextService } from './auth-request-context.service';
import { AuthTokenVerifierService } from './auth-token-verifier.service';
import { OriginResolverService } from '../shared/origin-resolver.service';
import { ensureAuthenticatedMutationCsrf } from '../shared-common/csrf-protection';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    private readonly requestContextService: AuthRequestContextService,
    private readonly tokenVerifier: AuthTokenVerifierService,
    private readonly consumerSessionValidator: AuthConsumerSessionValidatorService,
    private readonly adminSessionValidator: AuthAdminSessionValidatorService,
    private readonly originResolver: OriginResolverService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request: TExpressRequest = context.switchToHttp().getRequest();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

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

    const identityContext =
      verified.scope === `admin`
        ? await this.adminSessionValidator.validate({
            accessToken: requestContext.accessToken,
            verified,
            identityId,
          })
        : await this.consumerSessionValidator.validate({
            accessToken: requestContext.accessToken,
            verified,
            identityId,
            requestAppScope: requestContext.consumerScope,
          });
    this.assignRequestIdentity(
      request,
      identityContext.identity,
      identityContext.identityType,
      identityContext.sessionId,
    );
    ensureAuthenticatedMutationCsrf(request, this.originResolver);
    return true;
  }

  assignRequestIdentity(request: TExpressRequest, incoming: IIdentity, type: string, sessionId?: string): void {
    const ctx: IIdentityContext = { id: incoming.id, email: incoming.email, type, ...(sessionId ? { sessionId } : {}) };
    Object.assign(request, { [IDENTITY]: ctx });
  }
}
