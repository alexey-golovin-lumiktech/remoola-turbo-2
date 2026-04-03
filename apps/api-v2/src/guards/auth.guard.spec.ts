import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { type ExecutionContext } from '@nestjs/common/interfaces/features/execution-context.interface';
import { type Reflector } from '@nestjs/core';
import { type JwtService } from '@nestjs/jwt';

import { COOKIE_KEYS } from '@remoola/api-types';
import { oauthCrypto } from '@remoola/security-utils';

import { IDENTITY } from '../common';
import { AuthGuard } from './auth.guard';
import { getApiConsumerAccessTokenCookieKeysForRead, getApiConsumerCsrfTokenCookieKeysForRead } from '../shared-common';

type MockRequest = {
  path: string;
  url: string;
  method?: string;
  cookies: Record<string, string>;
  headers?: Record<string, string>;
  [IDENTITY]?: { id: string; email: string; type: string };
};

describe(`AuthGuard`, () => {
  const reflector = {
    get: jest.fn(),
  };
  const jwtService = {
    verify: jest.fn(),
  };
  const prisma = {
    authSessionModel: {
      findFirst: jest.fn(),
    },
    accessRefreshTokenModel: {
      findFirst: jest.fn(),
    },
    adminModel: {
      findFirst: jest.fn(),
    },
    consumerModel: {
      findFirst: jest.fn(),
    },
  };
  const originResolver = {
    resolveRequestOriginForPath: jest.fn(),
    resolveConsumerRequestAppScope: jest.fn(),
  };

  let guard: AuthGuard;

  const buildContext = (request: MockRequest): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => undefined,
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    reflector.get.mockReturnValue(false);
    originResolver.resolveRequestOriginForPath.mockReturnValue(`https://consumer.example.com`);
    originResolver.resolveConsumerRequestAppScope.mockReturnValue(`consumer`);
    guard = new AuthGuard(
      reflector as unknown as Reflector,
      jwtService as unknown as JwtService,
      prisma as never,
      originResolver as never,
    );
  });

  it(`rejects an admin-scoped token on consumer routes`, async () => {
    const [consumerAccessCookieKey] = getApiConsumerAccessTokenCookieKeysForRead(`consumer`);
    const request: MockRequest = {
      path: `/api/consumer/auth/me`,
      url: `/api/consumer/auth/me`,
      cookies: {
        [consumerAccessCookieKey]: `token`,
      },
    };
    jwtService.verify.mockReturnValue({
      identityId: `identity-1`,
      typ: `access`,
      scope: `admin`,
    });

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(`Access restricted to consumers`);
    expect(prisma.authSessionModel.findFirst).not.toHaveBeenCalled();
    expect(prisma.accessRefreshTokenModel.findFirst).not.toHaveBeenCalled();
  });

  it(`rejects a consumer-scoped token on admin routes`, async () => {
    const request: MockRequest = {
      path: `/api/admin/consumers`,
      url: `/api/admin/consumers`,
      cookies: {
        [COOKIE_KEYS.ADMIN_ACCESS_TOKEN]: `token`,
      },
    };
    jwtService.verify.mockReturnValue({
      identityId: `identity-2`,
      typ: `access`,
      scope: `consumer`,
    });

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(`Access restricted to administrators`);
    expect(prisma.authSessionModel.findFirst).not.toHaveBeenCalled();
    expect(prisma.accessRefreshTokenModel.findFirst).not.toHaveBeenCalled();
  });

  it(`allows legacy no-scope consumer token to continue with existing checks`, async () => {
    const [consumerAccessCookieKey] = getApiConsumerAccessTokenCookieKeysForRead(`consumer`);
    const request: MockRequest = {
      path: `/api/consumer/profile`,
      url: `/api/consumer/profile`,
      cookies: {
        [consumerAccessCookieKey]: `token`,
      },
    };
    jwtService.verify.mockReturnValue({
      identityId: `consumer-1`,
      sid: `session-1`,
      typ: `access`,
    });
    prisma.authSessionModel.findFirst.mockResolvedValue({
      id: `session-1`,
      consumerId: `consumer-1`,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.adminModel.findFirst.mockResolvedValue(null);
    prisma.consumerModel.findFirst.mockResolvedValue({
      id: `consumer-1`,
      email: `consumer@example.com`,
    });

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
    expect(prisma.authSessionModel.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.accessRefreshTokenModel.findFirst).not.toHaveBeenCalled();
    expect(request[IDENTITY]).toEqual({
      id: `consumer-1`,
      email: `consumer@example.com`,
      type: `consumer`,
    });
  });

  it(`allows consumer token when stored access hash matches`, async () => {
    const token = `token`;
    const [consumerAccessCookieKey] = getApiConsumerAccessTokenCookieKeysForRead(`consumer`);
    const request: MockRequest = {
      path: `/api/consumer/profile`,
      url: `/api/consumer/profile`,
      cookies: {
        [consumerAccessCookieKey]: token,
      },
    };
    jwtService.verify.mockReturnValue({
      identityId: `consumer-1`,
      sid: `session-1`,
      typ: `access`,
      scope: `consumer`,
    });
    prisma.authSessionModel.findFirst.mockResolvedValue({
      id: `session-1`,
      consumerId: `consumer-1`,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      accessTokenHash: oauthCrypto.hashOAuthState(token),
    });
    prisma.adminModel.findFirst.mockResolvedValue(null);
    prisma.consumerModel.findFirst.mockResolvedValue({
      id: `consumer-1`,
      email: `consumer@example.com`,
    });

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
  });

  it(`rejects consumer token when stored access hash does not match`, async () => {
    const [consumerAccessCookieKey] = getApiConsumerAccessTokenCookieKeysForRead(`consumer`);
    const request: MockRequest = {
      path: `/api/consumer/profile`,
      url: `/api/consumer/profile`,
      cookies: {
        [consumerAccessCookieKey]: `token`,
      },
    };
    jwtService.verify.mockReturnValue({
      identityId: `consumer-1`,
      sid: `session-1`,
      typ: `access`,
      scope: `consumer`,
    });
    prisma.authSessionModel.findFirst.mockResolvedValue({
      id: `session-1`,
      consumerId: `consumer-1`,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      accessTokenHash: oauthCrypto.hashOAuthState(`different-token`),
    });

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(`Invalid or expired token`);
  });

  it(`still rejects missing token cookie`, async () => {
    const request: MockRequest = {
      path: `/api/consumer/auth/me`,
      url: `/api/consumer/auth/me`,
      cookies: {},
    };

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(`Invalid or expired token`);
  });

  it(`rejects a refresh token presented as an access cookie`, async () => {
    const [consumerAccessCookieKey] = getApiConsumerAccessTokenCookieKeysForRead(`consumer`);
    const request: MockRequest = {
      path: `/api/consumer/profile`,
      url: `/api/consumer/profile`,
      cookies: {
        [consumerAccessCookieKey]: `token`,
      },
    };
    jwtService.verify.mockReturnValue({
      identityId: `consumer-1`,
      sid: `session-1`,
      typ: `refresh`,
      scope: `consumer`,
    });

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(`Invalid or expired token`);
  });

  it(`rejects authenticated consumer mutations without a valid csrf token`, async () => {
    const [consumerAccessCookieKey] = getApiConsumerAccessTokenCookieKeysForRead(`consumer`);
    const request: MockRequest = {
      method: `POST`,
      path: `/api/consumer/profile`,
      url: `/api/consumer/profile`,
      headers: { origin: `https://consumer.example.com` },
      cookies: {
        [consumerAccessCookieKey]: `token`,
      },
    };
    jwtService.verify.mockReturnValue({
      identityId: `consumer-1`,
      sid: `session-1`,
      typ: `access`,
      scope: `consumer`,
    });
    prisma.authSessionModel.findFirst.mockResolvedValue({
      id: `session-1`,
      consumerId: `consumer-1`,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.adminModel.findFirst.mockResolvedValue(null);
    prisma.consumerModel.findFirst.mockResolvedValue({
      id: `consumer-1`,
      email: `consumer@example.com`,
    });

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(`Invalid CSRF token`);
  });

  it(`does not require csrf for authenticated consumer reads`, async () => {
    const [consumerAccessCookieKey] = getApiConsumerAccessTokenCookieKeysForRead(`consumer`);
    const request: MockRequest = {
      method: `GET`,
      path: `/api/consumer/profile`,
      url: `/api/consumer/profile`,
      headers: { origin: `https://consumer.example.com` },
      cookies: {
        [consumerAccessCookieKey]: `token`,
      },
    };
    jwtService.verify.mockReturnValue({
      identityId: `consumer-1`,
      sid: `session-1`,
      typ: `access`,
      scope: `consumer`,
    });
    prisma.authSessionModel.findFirst.mockResolvedValue({
      id: `session-1`,
      consumerId: `consumer-1`,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.adminModel.findFirst.mockResolvedValue(null);
    prisma.consumerModel.findFirst.mockResolvedValue({
      id: `consumer-1`,
      email: `consumer@example.com`,
    });

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
  });

  it(`uses the mobile consumer namespace selected by trusted origin`, async () => {
    const [mobileAccessCookieKey] = getApiConsumerAccessTokenCookieKeysForRead(`consumer-mobile`);
    const [mobileCsrfCookieKey] = getApiConsumerCsrfTokenCookieKeysForRead(`consumer-mobile`);
    originResolver.resolveRequestOriginForPath.mockReturnValue(`https://mobile.example.com`);
    originResolver.resolveConsumerRequestAppScope.mockReturnValue(`consumer-mobile`);
    const request: MockRequest = {
      method: `POST`,
      path: `/api/consumer/profile`,
      url: `/api/consumer/profile`,
      headers: {
        origin: `https://mobile.example.com`,
        'x-csrf-token': `csrf-token`,
      },
      cookies: {
        [mobileAccessCookieKey]: `token`,
        [mobileCsrfCookieKey]: `csrf-token`,
      },
    };
    jwtService.verify.mockReturnValue({
      identityId: `consumer-1`,
      sid: `session-1`,
      typ: `access`,
      scope: `consumer`,
    });
    prisma.authSessionModel.findFirst.mockResolvedValue({
      id: `session-1`,
      consumerId: `consumer-1`,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.adminModel.findFirst.mockResolvedValue(null);
    prisma.consumerModel.findFirst.mockResolvedValue({
      id: `consumer-1`,
      email: `consumer@example.com`,
    });

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
  });
});
