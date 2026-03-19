import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import { type JwtService } from '@nestjs/jwt';
import { type Request as TExpressRequest } from 'express';

import { resolveAccessTokenCookieKeysForPath } from '@remoola/api-types';

import { IDENTITY, type IIdentity, type IIdentityContext, IS_PUBLIC } from '../common';
import { type IJwtTokenPayload } from '../dtos/consumer';
import { type PrismaService } from '../shared/prisma.service';
import { secureCompare } from '../shared-common';

const CONSUMER_API_PATH_PREFIX = `/api/consumer/`;
const ADMIN_API_PATH_PREFIX = `/api/admin/`;

/** User-facing and log-safe messages (no tokens or PII). */
const GuardMessage = {
  INVALID_TOKEN: `Invalid or expired token`,
  NO_IDENTITY_RECORD: `Authentication record not found`,
  ONLY_FOR_ADMINS: `Access restricted to administrators`,
  ONLY_FOR_CONSUMERS: `Access restricted to consumers`,
} as const;

export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request: TExpressRequest = context.switchToHttp().getRequest();
    const isPublic = this.reflector.get<boolean>(IS_PUBLIC, context.getHandler());
    if (isPublic) return true;

    const path = request.path ?? request.url?.split(`?`)[0] ?? ``;
    const cookieAccessToken = resolveAccessTokenCookieKeysForPath(path)
      .map((key) => request.cookies[key])
      .find((value): value is string => typeof value === `string` && value.length > 0);
    if (!cookieAccessToken) {
      throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
    }
    return await this.bearerProcessor(cookieAccessToken, request);
  }

  private getAdminByIdentityId(identityId: string) {
    return this.prisma.adminModel.findFirst({ where: { id: identityId } });
  }

  private getConsumerByIdentityId(identityId: string) {
    return this.prisma.consumerModel.findFirst({ where: { id: identityId } });
  }

  private findIdentityAccess(params: { identityId: string; accessToken: string; refreshToken?: string }) {
    return this.prisma.accessRefreshTokenModel.findFirst({
      where: {
        identityId: params.identityId,
        accessToken: params.accessToken,
        ...(params.refreshToken && { refreshToken: params.refreshToken }),
      },
    });
  }

  private async bearerProcessor(accessToken: string, request: TExpressRequest) {
    let verified: IJwtTokenPayload;
    try {
      verified = this.jwtService.verify<IJwtTokenPayload>(accessToken);
    } catch {
      this.logger.warn(`AuthGuard: JWT verification failed`);
      throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
    }

    // Reject refresh or other token types (consumer access and refresh share same secret).
    if (verified.typ !== undefined && verified.typ !== `access`) {
      this.logger.warn(`AuthGuard: token typ is not access`);
      throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
    }

    const path = request.path ?? request.url?.split(`?`)[0] ?? ``;

    // Defense-in-depth scope check: reject cross-domain tokens early before DB lookups.
    // Only applied when scope claim is present; legacy tokens without scope fall through to DB-level checks.
    if (verified.scope === `admin` && path.startsWith(CONSUMER_API_PATH_PREFIX)) {
      this.logger.warn(`AuthGuard: admin token used on consumer path`);
      throw new ForbiddenException(GuardMessage.ONLY_FOR_CONSUMERS);
    }
    if (verified.scope === `consumer` && path.startsWith(ADMIN_API_PATH_PREFIX)) {
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
      if (!verified.sid) {
        this.logger.warn(`AuthGuard: consumer access token missing sid`);
        throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
      }
      const session = await this.prisma.authSessionModel.findFirst({
        where: { id: verified.sid, consumerId: identityId, revokedAt: null },
      });
      if (session == null || session.expiresAt < new Date()) {
        this.logger.warn(`AuthGuard: consumer session not found or expired`);
        throw new UnauthorizedException(GuardMessage.NO_IDENTITY_RECORD);
      }
    } else {
      const identityAccess = await this.findIdentityAccess({ identityId, accessToken });
      if (identityAccess == null) {
        this.logger.warn(`AuthGuard: no identity access record`);
        throw new UnauthorizedException(GuardMessage.NO_IDENTITY_RECORD);
      }
      if (!secureCompare(identityAccess.accessToken, accessToken)) {
        this.logger.warn(`AuthGuard: token mismatch with stored value`);
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

    if (path.startsWith(ADMIN_API_PATH_PREFIX) && !admin) {
      this.logger.warn(`AuthGuard: consumer attempted admin path`);
      throw new ForbiddenException(GuardMessage.ONLY_FOR_ADMINS);
    }

    if (path.startsWith(CONSUMER_API_PATH_PREFIX) && !consumer) {
      this.logger.warn(`AuthGuard: admin attempted consumer path`);
      throw new ForbiddenException(GuardMessage.ONLY_FOR_CONSUMERS);
    }

    this.assignRequestIdentity(request, identity, admin?.type ?? `consumer`);
    return true;
  }

  assignRequestIdentity(request: TExpressRequest, incoming: IIdentity, type: string): void {
    const ctx: IIdentityContext = { id: incoming.id, email: incoming.email, type };
    Object.assign(request, { [IDENTITY]: ctx });
  }
}
