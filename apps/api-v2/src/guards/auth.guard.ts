import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { type Request as TExpressRequest } from 'express';

import { CONSUMER_APP_SCOPE_HEADER, isAdminApiPath, type ConsumerAppScope } from '@remoola/api-types';
import { oauthCrypto } from '@remoola/security-utils';
import { errorCodes } from '@remoola/shared-constants';

import { IDENTITY, type IIdentity, type IIdentityContext, IS_PUBLIC } from '../common';
import { type IJwtTokenPayload } from '../dtos/consumer';
import { envs } from '../envs';
import { OriginResolverService } from '../shared/origin-resolver.service';
import { PrismaService } from '../shared/prisma.service';
import {
  getApiAdminAccessTokenCookieKeysForRead,
  getApiConsumerAccessTokenCookieKeysForRead,
  secureCompare,
} from '../shared-common';
import { ensureAuthenticatedMutationCsrf } from '../shared-common/csrf-protection';

const CONSUMER_API_PATH_PREFIX = `/api/consumer/`;

const GuardMessage = {
  INVALID_TOKEN: `Invalid or expired token`,
  NO_IDENTITY_RECORD: `Authentication record not found`,
  ONLY_FOR_ADMINS: `Access restricted to administrators`,
  ONLY_FOR_CONSUMERS: `Access restricted to consumers`,
} as const;

function getAccessTokenCookieKeysForPath(
  path: string,
  consumerScope?: Parameters<typeof getApiConsumerAccessTokenCookieKeysForRead>[0],
): readonly string[] {
  if (path.startsWith(CONSUMER_API_PATH_PREFIX)) {
    if (!consumerScope) {
      return [];
    }
    return getApiConsumerAccessTokenCookieKeysForRead(consumerScope);
  }
  if (isAdminApiPath(path)) {
    return getApiAdminAccessTokenCookieKeysForRead();
  }
  return getApiConsumerAccessTokenCookieKeysForRead(consumerScope);
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    private readonly originResolver: OriginResolverService = new OriginResolverService(),
  ) {}

  async canActivate(context: ExecutionContext) {
    const request: TExpressRequest = context.switchToHttp().getRequest();
    const isPublic = this.reflector.get<boolean>(IS_PUBLIC, context.getHandler());
    if (isPublic) return true;

    const path = request.path ?? request.url?.split(`?`)[0] ?? ``;
    const isConsumerPath = path.startsWith(CONSUMER_API_PATH_PREFIX);
    const consumerScope = isConsumerPath
      ? this.originResolver.validateConsumerAppScopeHeader(request.headers?.[CONSUMER_APP_SCOPE_HEADER])
      : undefined;
    if (isConsumerPath && !consumerScope) {
      throw new UnauthorizedException(`Invalid app scope`);
    }
    const cookieAccessToken = getAccessTokenCookieKeysForPath(path, consumerScope)
      .map((key) => request.cookies[key])
      .find((value): value is string => typeof value === `string` && value.length > 0);
    if (!cookieAccessToken) {
      throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
    }
    await this.processAccessToken(cookieAccessToken, request, consumerScope);
    ensureAuthenticatedMutationCsrf(request, this.originResolver);
    return true;
  }

  private getAdminByIdentityId(identityId: string) {
    return this.prisma.adminModel.findFirst({ where: { id: identityId, deletedAt: null } });
  }

  private getConsumerByIdentityId(identityId: string) {
    return this.prisma.consumerModel.findFirst({ where: { id: identityId } });
  }

  private async processAccessToken(accessToken: string, request: TExpressRequest, requestAppScope?: ConsumerAppScope) {
    let verified: IJwtTokenPayload;
    const path = request.path ?? request.url?.split(`?`)[0] ?? ``;
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

    if (verified.scope === `admin` && path.startsWith(CONSUMER_API_PATH_PREFIX)) {
      this.logger.warn(`AuthGuard: admin token used on consumer path`);
      throw new ForbiddenException(GuardMessage.ONLY_FOR_CONSUMERS);
    }
    if (verified.scope === `consumer` && isAdminApiPath(path)) {
      this.logger.warn(`AuthGuard: consumer token used on admin path`);
      throw new ForbiddenException(GuardMessage.ONLY_FOR_ADMINS);
    }

    const identityId = verified.identityId ?? verified.sub;
    if (!identityId) {
      this.logger.warn(`AuthGuard: token missing identityId`);
      throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
    }

    const isConsumerPath = path.startsWith(CONSUMER_API_PATH_PREFIX);
    if (isConsumerPath) {
      const tokenAppScope = this.originResolver.validateConsumerAppScope(verified.appScope);
      if (!requestAppScope || !tokenAppScope || tokenAppScope !== requestAppScope) {
        this.logger.warn(`AuthGuard: consumer access token app scope mismatch`);
        throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
      }
      if (!verified.sid) {
        this.logger.warn(`AuthGuard: consumer access token missing sid`);
        throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
      }
      const session = await this.prisma.authSessionModel.findFirst({
        where: { id: verified.sid, consumerId: identityId, appScope: requestAppScope, revokedAt: null },
      });
      if (session == null || session.expiresAt < new Date()) {
        this.logger.warn(`AuthGuard: consumer session not found or expired`);
        throw new UnauthorizedException(GuardMessage.NO_IDENTITY_RECORD);
      }
      if (session.appScope !== requestAppScope) {
        this.logger.warn(`AuthGuard: consumer session app scope mismatch`);
        throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
      }
      if (session.accessTokenHash && !secureCompare(session.accessTokenHash, oauthCrypto.hashOAuthState(accessToken))) {
        this.logger.warn(`AuthGuard: consumer access token mismatch with stored value`);
        throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
      }
    } else {
      if (!verified.sid) {
        this.logger.warn(`AuthGuard: admin access token missing sid`);
        throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
      }
      const session = await this.prisma.adminAuthSessionModel.findFirst({
        where: { id: verified.sid, adminId: identityId, revokedAt: null },
      });
      if (session == null || session.expiresAt < new Date()) {
        this.logger.warn(`AuthGuard: admin session not found or expired`);
        throw new UnauthorizedException(GuardMessage.NO_IDENTITY_RECORD);
      }
      if (!secureCompare(session.accessTokenHash, oauthCrypto.hashOAuthState(accessToken))) {
        this.logger.warn(`AuthGuard: admin access token mismatch with stored value`);
        throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
      }
    }

    const admin = await this.getAdminByIdentityId(identityId);
    const consumer = await this.getConsumerByIdentityId(identityId);
    const identity = admin ?? consumer;

    if (identity == null) {
      this.logger.warn(`AuthGuard: no identity for verified identityId`);
      throw new UnauthorizedException(GuardMessage.NO_IDENTITY_RECORD);
    }

    if (isAdminApiPath(path) && !admin) {
      this.logger.warn(`AuthGuard: consumer attempted admin path`);
      throw new ForbiddenException(GuardMessage.ONLY_FOR_ADMINS);
    }

    if (path.startsWith(CONSUMER_API_PATH_PREFIX) && !consumer) {
      this.logger.warn(`AuthGuard: admin attempted consumer path`);
      throw new ForbiddenException(GuardMessage.ONLY_FOR_CONSUMERS);
    }

    if (path.startsWith(CONSUMER_API_PATH_PREFIX) && consumer?.suspendedAt != null) {
      this.logger.warn(`AuthGuard: suspended consumer attempted consumer path`);
      throw new ForbiddenException(errorCodes.ACCOUNT_SUSPENDED);
    }

    this.assignRequestIdentity(request, identity, admin?.type ?? `consumer`, verified.sid);
    return true;
  }

  assignRequestIdentity(request: TExpressRequest, incoming: IIdentity, type: string, sessionId?: string): void {
    const ctx: IIdentityContext = { id: incoming.id, email: incoming.email, type, ...(sessionId ? { sessionId } : {}) };
    Object.assign(request, { [IDENTITY]: ctx });
  }
}
