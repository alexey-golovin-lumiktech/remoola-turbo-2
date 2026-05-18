import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Request as TExpressRequest } from 'express';

import { IDENTITY, type IIdentity, type IIdentityContext, IS_PUBLIC } from '../common';
import { TokenValidationService } from './token-validation.service';
import { OriginResolverService } from '../shared/origin-resolver.service';
import { ensureAuthenticatedMutationCsrf } from '../shared-common/csrf-protection';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    private readonly tokenValidationService: TokenValidationService,
    private readonly originResolver: OriginResolverService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request: TExpressRequest = context.switchToHttp().getRequest();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const identityContext = await this.tokenValidationService.validate(request);
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
