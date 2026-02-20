import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import { type JwtService } from '@nestjs/jwt';

import { IDENTITY, type IIdentity, IS_PUBLIC } from '../common';
import { type IJwtTokenPayload } from '../dtos/consumer';
import { type PrismaService } from '../shared/prisma.service';
import { ADMIN_ACCESS_TOKEN_COOKIE_KEY, CONSUMER_ACCESS_TOKEN_COOKIE_KEY, secureCompare } from '../shared-common';

import type express from 'express';

const ADMIN_API_PATH_PREFIX = `/api/admin/`;
const CONSUMER_API_PATH_PREFIX = `/api/consumer/`;

function getAccessTokenCookieKey(path: string): string {
  if (path.startsWith(ADMIN_API_PATH_PREFIX)) return ADMIN_ACCESS_TOKEN_COOKIE_KEY;
  if (path.startsWith(CONSUMER_API_PATH_PREFIX)) return CONSUMER_ACCESS_TOKEN_COOKIE_KEY;
  return CONSUMER_ACCESS_TOKEN_COOKIE_KEY;
}

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
    const request: express.Request = context.switchToHttp().getRequest();
    const isPublic = this.reflector.get<boolean>(IS_PUBLIC, context.getHandler());
    if (isPublic) return true;

    const path = request.path ?? request.url?.split(`?`)[0] ?? ``;
    const cookieKey = getAccessTokenCookieKey(path);
    const cookieAccessToken = request.cookies[cookieKey];
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

  private async bearerProcessor(accessToken: string, request: express.Request) {
    let verified: IJwtTokenPayload;
    try {
      verified = this.jwtService.verify<IJwtTokenPayload>(accessToken);
    } catch {
      this.logger.warn(`AuthGuard: JWT verification failed`);
      throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
    }

    if (!verified?.identityId) {
      this.logger.warn(`AuthGuard: token missing identityId`);
      throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
    }

    const identityAccess = await this.findIdentityAccess({ identityId: verified.identityId, accessToken });

    if (identityAccess == null) {
      this.logger.warn(`AuthGuard: no identity access record`);
      throw new UnauthorizedException(GuardMessage.NO_IDENTITY_RECORD);
    }

    if (!secureCompare(identityAccess.accessToken, accessToken)) {
      this.logger.warn(`AuthGuard: token mismatch with stored value`);
      throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
    }

    const admin = await this.getAdminByIdentityId(verified.identityId);
    const consumer = await this.getConsumerByIdentityId(verified.identityId);
    const identity = admin ?? consumer;

    if (identity == null) {
      this.logger.warn(`AuthGuard: no identity for verified identityId`);
      throw new UnauthorizedException(GuardMessage.NO_IDENTITY_RECORD);
    }

    const path = request.path ?? request.url?.split(`?`)[0] ?? ``;
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

  assignRequestIdentity(request: express.Request, incoming: IIdentity, type: string): void {
    const identity = { [IDENTITY]: { id: incoming.id, email: incoming.email, type } };
    Object.assign(request, identity);
  }
}
