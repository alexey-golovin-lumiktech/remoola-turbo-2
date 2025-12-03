import { type CanActivate, type ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import { type JwtService } from '@nestjs/jwt';

import { IDENTITY, type IIdentity, IS_PUBLIC } from '../common';
import { type IJwtTokenPayload } from '../dtos/consumer';
import { type PrismaService } from '../shared/prisma.service';
import {
  ACCESS_TOKEN_COOKIE_KEY,
  AuthHeader,
  type AuthHeaderValue,
  CredentialsSeparator,
  passwordUtils,
} from '../shared-common';

import type express from 'express';

const ADMIN_API_URL_STARTS = `/api/admin/`;
const CONSUMER_API_URL_STARTS = `/api/consumer/`;

const GuardMessage = {
  LOST_HEADER: `[AuthGuard] lost required authorization header!`,
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
  private readonly separator = CredentialsSeparator;

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
    if (cookieAccessToken) return this.bearerProcessor(cookieAccessToken, request);

    const { authorization = null } = request.headers;
    if (authorization == null || authorization.length == 0)
      return this.throwError(GuardMessage.LOST_HEADER + ` url: ` + request.url);

    const [type, encoded] = authorization.split(this.separator.Token) as [AuthHeaderValue, string];
    if (Object.values(AuthHeader).includes(type) == false) return this.throwError(GuardMessage.UNEXPECTED(type));

    return this.processors[type](encoded, request);
  }

  private readonly processors = {
    [AuthHeader.Basic]: this.basicProcessor.bind(this),
    [AuthHeader.Bearer]: this.bearerProcessor.bind(this),
  };

  private findAdminByEmail(where: { email: string }) {
    return this.prisma.adminModel.findFirst({ where });
  }

  private findConsumerByEmail(where: { email: string }) {
    return this.prisma.consumerModel.findFirst({ where });
  }

  private findAdminById(identityId: string) {
    return this.prisma.adminModel.findFirst({ where: { id: identityId } });
  }

  private findConsumerById(identityId: string) {
    return this.prisma.consumerModel.findFirst({ where: { id: identityId } });
  }

  private findIdentityAccess(dto: { identityId: string; accessToken: string; refreshToken?: string }) {
    return this.prisma.accessRefreshTokenModel.findFirst({
      where: {
        identityId: dto.identityId,
        accessToken: dto.accessToken,
        ...(dto.refreshToken && { refreshToken: dto.refreshToken }),
      },
    });
  }

  private async basicProcessor(encoded: string, request: express.Request) {
    const decoded = Buffer.from(encoded, `base64`).toString(`utf-8`);
    const [email, password] = decoded.split(this.separator.Credentials).map((x) => x.trim());
    const admin = await this.findAdminByEmail({ email });
    const consumer = await this.findConsumerByEmail({ email });
    const identity = admin ?? consumer;

    if (identity == null) {
      return this.throwError(GuardMessage.NO_IDENTITY);
    }

    if (request.url.startsWith(ADMIN_API_URL_STARTS) && !admin) {
      return this.throwError(GuardMessage.ONLY_FOR_ADMINS);
    }

    if (request.url.startsWith(CONSUMER_API_URL_STARTS) && !consumer) {
      return this.throwError(GuardMessage.ONLY_FOR_CONSUMERS);
    }

    if (consumer && consumer.verified == false) return this.throwError(GuardMessage.NOT_VERIFIED);

    const isVerifiedPassword = await passwordUtils.verifyPassword({
      password,
      storedHash: identity.password,
      storedSalt: identity.salt,
    });
    if (!isVerifiedPassword) return this.throwError(GuardMessage.INVALID_CREDENTIALS);

    this.assign(request, identity, admin?.type ?? `consumer`);
    return true;
  }

  private async bearerProcessor(accessToken: string, request: express.Request) {
    const verified = this.jwtService.verify<IJwtTokenPayload>(accessToken);
    if (verified == null) return this.throwError(`[AuthGuard][bearerProcessor] invalid token. no verified`);
    if (!verified.identityId) return this.throwError(`[AuthGuard][bearerProcessor] invalid token. no identity id`);

    const exist = await this.findIdentityAccess({ identityId: verified.identityId, accessToken });
    if (exist == null) return this.throwError(`no identity record`);
    if (exist.accessToken != accessToken) return this.throwError(`provided access token is not valid`);

    const admin = await this.findAdminById(verified.identityId);
    const consumer = await this.findConsumerById(verified.identityId);
    const identity = admin ?? consumer;

    if (identity == null) {
      return this.throwError(GuardMessage.NO_IDENTITY);
    }

    if (request.url.startsWith(ADMIN_API_URL_STARTS) && !admin) {
      return this.throwError(GuardMessage.ONLY_FOR_ADMINS);
    }
    if (request.url.startsWith(CONSUMER_API_URL_STARTS) && !consumer) {
      return this.throwError(GuardMessage.ONLY_FOR_CONSUMERS);
    }
    this.assign(request, identity, admin?.type ?? `consumer`);
    return true;
  }

  assign(request: express.Request, incoming: IIdentity, type: string): void {
    const identity = { [IDENTITY]: { id: incoming.id, email: incoming.email, type } };
    Object.assign(request, identity);
  }

  private throwError(message: string): never {
    this.logger.error(message);

    throw new ForbiddenException(message);
  }
}
