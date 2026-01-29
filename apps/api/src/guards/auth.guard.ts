import { type CanActivate, type ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import { type JwtService } from '@nestjs/jwt';

import { IDENTITY, type IIdentity, IS_PUBLIC } from '../common';
import { type IJwtTokenPayload } from '../dtos/consumer';
import { type PrismaService } from '../shared/prisma.service';
import { ACCESS_TOKEN_COOKIE_KEY } from '../shared-common';

import type express from 'express';

const ADMIN_API_URL_STARTS = `/api/admin/`;
const CONSUMER_API_URL_STARTS = `/api/consumer/`;

const GuardMessage = {
  UNEXPECTED: (type: string) => `[AuthGuard] unexpected auth header type: ${type}`,
  INVALID_CREDENTIALS: `[AuthGuard] invalid email or password`,
  INVALID_TOKEN: `[AuthGuard] invalid token`,
  PROVIDED_TOKEN_IS_EXPIRED_OR_NOT_IN_REPOSITORY: `[AuthGuard] provided token is expired or not in repository`,
  NO_IDENTITY: `[AuthGuard] no identity for given credentials.`,
  NOT_VERIFIED: `[AuthGuard] probably your email address is not verified yet. Check you email address`,
  ONLY_FOR_ADMINS: `[AuthGuard] only for admins`,
  ONLY_FOR_CONSUMERS: `[AuthGuard] only for consumers`,
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

    const cookieAccessToken = request.cookies[ACCESS_TOKEN_COOKIE_KEY];
    if (cookieAccessToken) return await this.bearerProcessor(cookieAccessToken, request);

    return false;
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
    const verified = this.jwtService.verify<IJwtTokenPayload>(accessToken);
    if (verified == null) {
      return this.throwForbiddenException(`[AuthGuard][bearerProcessor] invalid token. no verified`);
    }

    if (!verified.identityId) {
      return this.throwForbiddenException(`[AuthGuard][bearerProcessor] invalid token. no identity id`);
    }

    const identityAccess = await this.findIdentityAccess({ identityId: verified.identityId, accessToken });

    if (identityAccess == null) {
      return this.throwForbiddenException(`no identity record`);
    }

    if (identityAccess.accessToken != accessToken) {
      return this.throwForbiddenException(`provided access token is not valid`);
    }

    const admin = await this.getAdminByIdentityId(verified.identityId);
    const consumer = await this.getConsumerByIdentityId(verified.identityId);
    const identity = admin ?? consumer;

    if (identity == null) {
      return this.throwForbiddenException(GuardMessage.NO_IDENTITY);
    }

    if (request.url.startsWith(ADMIN_API_URL_STARTS) && !admin) {
      return this.throwForbiddenException(GuardMessage.ONLY_FOR_ADMINS);
    }

    if (request.url.startsWith(CONSUMER_API_URL_STARTS) && !consumer) {
      return this.throwForbiddenException(GuardMessage.ONLY_FOR_CONSUMERS);
    }

    this.assignRequestIdentity(request, identity, admin?.type ?? `consumer`);
    return true;
  }

  assignRequestIdentity(request: express.Request, incoming: IIdentity, type: string): void {
    const identity = { [IDENTITY]: { id: incoming.id, email: incoming.email, type } };
    Object.assign(request, identity);
  }

  private throwForbiddenException(message: string): never {
    this.logger.error(message);

    throw new ForbiddenException(message);
  }
}
