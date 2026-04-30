import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { type ExecutionContext } from '@nestjs/common/interfaces/features/execution-context.interface';
import { Reflector } from '@nestjs/core';
import { type JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { CONSUMER_APP_SCOPE_HEADER, COOKIE_KEYS, CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';
import { oauthCrypto } from '@remoola/security-utils';
import { errorCodes } from '@remoola/shared-constants';

import { JwtPassportModule } from '../auth/jwt-passport.module';
import { type IDENTITY } from '../common';
import { AuthGuard } from './auth.guard';
import { OriginResolverService } from '../shared/origin-resolver.service';
import { PrismaService } from '../shared/prisma.service';
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
    adminAuthSessionModel: {
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
    validateConsumerAppScope: jest.fn(),
    validateConsumerAppScopeHeader: jest.fn(),
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
    originResolver.validateConsumerAppScope.mockImplementation((value?: string | null) =>
      value === CURRENT_CONSUMER_APP_SCOPE ? CURRENT_CONSUMER_APP_SCOPE : undefined,
    );
    originResolver.validateConsumerAppScopeHeader.mockImplementation((value?: string | string[]) => {
      const headerValue = Array.isArray(value) ? value[0] : value;
      return headerValue === CURRENT_CONSUMER_APP_SCOPE ? CURRENT_CONSUMER_APP_SCOPE : undefined;
    });
    guard = new AuthGuard(
      reflector as unknown as Reflector,
      jwtService as unknown as JwtService,
      prisma as never,
      originResolver as never,
    );
  });

  it(`resolves JwtService for the app-level auth guard via JwtPassportModule`, async () => {
    const module = await Test.createTestingModule({
      imports: [JwtPassportModule],
      providers: [
        AuthGuard,
        { provide: Reflector, useValue: reflector },
        { provide: PrismaService, useValue: prisma },
        { provide: OriginResolverService, useValue: originResolver },
      ],
    }).compile();

    expect(module.get(AuthGuard)).toBeInstanceOf(AuthGuard);
  });

  it(`rejects an admin-scoped token on consumer routes`, async () => {
    const [consumerAccessCookieKey] = getApiConsumerAccessTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
    const request: MockRequest = {
      path: `/api/consumer/auth/me`,
      url: `/api/consumer/auth/me`,
      headers: { [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE },
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
    expect(prisma.adminAuthSessionModel.findFirst).not.toHaveBeenCalled();
  });

  it(`rejects a consumer-scoped token on admin routes`, async () => {
    const request: MockRequest = {
      path: `/api/admin-v2/consumers`,
      url: `/api/admin-v2/consumers`,
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
    expect(prisma.adminAuthSessionModel.findFirst).not.toHaveBeenCalled();
  });

  it(`rejects consumer requests without an explicit app scope`, async () => {
    const [consumerAccessCookieKey] = getApiConsumerAccessTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
    const request: MockRequest = {
      path: `/api/consumer/profile`,
      url: `/api/consumer/profile`,
      cookies: {
        [consumerAccessCookieKey]: `token`,
      },
    };

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(`Invalid app scope`);
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it(`allows consumer token when stored access hash matches`, async () => {
    const token = `token`;
    const [consumerAccessCookieKey] = getApiConsumerAccessTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
    const request: MockRequest = {
      path: `/api/consumer/profile`,
      url: `/api/consumer/profile`,
      headers: { [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE },
      cookies: {
        [consumerAccessCookieKey]: token,
      },
    };
    jwtService.verify.mockReturnValue({
      identityId: `consumer-1`,
      sid: `session-1`,
      typ: `access`,
      scope: `consumer`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });
    prisma.authSessionModel.findFirst.mockResolvedValue({
      id: `session-1`,
      consumerId: `consumer-1`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
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
    const [consumerAccessCookieKey] = getApiConsumerAccessTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
    const request: MockRequest = {
      path: `/api/consumer/profile`,
      url: `/api/consumer/profile`,
      headers: { [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE },
      cookies: {
        [consumerAccessCookieKey]: `token`,
      },
    };
    jwtService.verify.mockReturnValue({
      identityId: `consumer-1`,
      sid: `session-1`,
      typ: `access`,
      scope: `consumer`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });
    prisma.authSessionModel.findFirst.mockResolvedValue({
      id: `session-1`,
      consumerId: `consumer-1`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
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
      headers: {
        origin: `https://consumer.example.com`,
        [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE,
      },
      cookies: {},
    };

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(`Invalid or expired token`);
  });

  it(`rejects a refresh token presented as an access cookie`, async () => {
    const [consumerAccessCookieKey] = getApiConsumerAccessTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
    const request: MockRequest = {
      path: `/api/consumer/profile`,
      url: `/api/consumer/profile`,
      headers: { [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE },
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

  it(`rejects an access token without an explicit scope claim`, async () => {
    const [consumerAccessCookieKey] = getApiConsumerAccessTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
    const request: MockRequest = {
      path: `/api/consumer/profile`,
      url: `/api/consumer/profile`,
      headers: { [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE },
      cookies: {
        [consumerAccessCookieKey]: `token`,
      },
    };
    jwtService.verify.mockReturnValue({
      identityId: `consumer-1`,
      sid: `session-1`,
      typ: `access`,
    });

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(`Invalid or expired token`);
    expect(prisma.authSessionModel.findFirst).not.toHaveBeenCalled();
  });

  it(`rejects authenticated consumer mutations without a valid csrf token`, async () => {
    const [consumerAccessCookieKey] = getApiConsumerAccessTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
    const request: MockRequest = {
      method: `POST`,
      path: `/api/consumer/profile`,
      url: `/api/consumer/profile`,
      headers: {
        origin: `https://consumer.example.com`,
        [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE,
      },
      cookies: {
        [consumerAccessCookieKey]: `token`,
      },
    };
    jwtService.verify.mockReturnValue({
      identityId: `consumer-1`,
      sid: `session-1`,
      typ: `access`,
      scope: `consumer`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });
    prisma.authSessionModel.findFirst.mockResolvedValue({
      id: `session-1`,
      consumerId: `consumer-1`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
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
    const [consumerAccessCookieKey] = getApiConsumerAccessTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
    const request: MockRequest = {
      method: `GET`,
      path: `/api/consumer/profile`,
      url: `/api/consumer/profile`,
      headers: {
        origin: `https://consumer.example.com`,
        [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE,
      },
      cookies: {
        [consumerAccessCookieKey]: `token`,
      },
    };
    jwtService.verify.mockReturnValue({
      identityId: `consumer-1`,
      sid: `session-1`,
      typ: `access`,
      scope: `consumer`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });
    prisma.authSessionModel.findFirst.mockResolvedValue({
      id: `session-1`,
      consumerId: `consumer-1`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
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

  it(`rejects suspended consumers on consumer routes even with a valid session`, async () => {
    const token = `token`;
    const [consumerAccessCookieKey] = getApiConsumerAccessTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
    const request: MockRequest = {
      method: `GET`,
      path: `/api/consumer/profile`,
      url: `/api/consumer/profile`,
      headers: {
        origin: `https://consumer.example.com`,
        [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE,
      },
      cookies: {
        [consumerAccessCookieKey]: token,
      },
    };
    jwtService.verify.mockReturnValue({
      identityId: `consumer-1`,
      sid: `session-1`,
      typ: `access`,
      scope: `consumer`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });
    prisma.authSessionModel.findFirst.mockResolvedValue({
      id: `session-1`,
      consumerId: `consumer-1`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      accessTokenHash: oauthCrypto.hashOAuthState(token),
    });
    prisma.adminModel.findFirst.mockResolvedValue(null);
    prisma.consumerModel.findFirst.mockResolvedValue({
      id: `consumer-1`,
      email: `consumer@example.com`,
      suspendedAt: new Date(`2026-04-16T19:00:00.000Z`),
    });

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(errorCodes.ACCOUNT_SUSPENDED);
  });

  it(`rejects admin access tokens that are missing a sid claim`, async () => {
    const token = `admin-token`;
    const request: MockRequest = {
      method: `GET`,
      path: `/api/admin-v2/consumers`,
      url: `/api/admin-v2/consumers`,
      cookies: {
        [COOKIE_KEYS.ADMIN_ACCESS_TOKEN]: token,
      },
    };
    jwtService.verify.mockReturnValue({
      identityId: `admin-1`,
      typ: `access`,
      scope: `admin`,
    });

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(`Invalid or expired token`);
    expect(prisma.adminAuthSessionModel.findFirst).not.toHaveBeenCalled();
    expect(prisma.adminModel.findFirst).not.toHaveBeenCalled();
  });

  it(`rejects admin access tokens when the admin session is missing or expired`, async () => {
    const token = `admin-token`;
    const request: MockRequest = {
      method: `GET`,
      path: `/api/admin-v2/consumers`,
      url: `/api/admin-v2/consumers`,
      cookies: {
        [COOKIE_KEYS.ADMIN_ACCESS_TOKEN]: token,
      },
    };
    jwtService.verify.mockReturnValue({
      identityId: `admin-1`,
      sid: `session-1`,
      typ: `access`,
      scope: `admin`,
    });
    prisma.adminAuthSessionModel.findFirst.mockResolvedValue(null);

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(`Authentication record not found`);
    expect(prisma.adminAuthSessionModel.findFirst).toHaveBeenCalledWith({
      where: { id: `session-1`, adminId: `admin-1`, revokedAt: null },
    });
  });

  it(`rejects admin access tokens when the stored access hash does not match`, async () => {
    const token = `admin-token`;
    const request: MockRequest = {
      method: `GET`,
      path: `/api/admin-v2/consumers`,
      url: `/api/admin-v2/consumers`,
      cookies: {
        [COOKIE_KEYS.ADMIN_ACCESS_TOKEN]: token,
      },
    };
    jwtService.verify.mockReturnValue({
      identityId: `admin-1`,
      sid: `session-1`,
      typ: `access`,
      scope: `admin`,
    });
    prisma.adminAuthSessionModel.findFirst.mockResolvedValue({
      id: `session-1`,
      adminId: `admin-1`,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      accessTokenHash: oauthCrypto.hashOAuthState(`other-token`),
    });

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(`Invalid or expired token`);
  });

  it(`accepts admin access tokens with a valid session and matching hash`, async () => {
    const token = `admin-token`;
    const request: MockRequest = {
      method: `GET`,
      path: `/api/admin-v2/consumers`,
      url: `/api/admin-v2/consumers`,
      cookies: {
        [COOKIE_KEYS.ADMIN_ACCESS_TOKEN]: token,
      },
    };
    jwtService.verify.mockReturnValue({
      identityId: `admin-1`,
      sid: `session-1`,
      typ: `access`,
      scope: `admin`,
    });
    prisma.adminAuthSessionModel.findFirst.mockResolvedValue({
      id: `session-1`,
      adminId: `admin-1`,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      accessTokenHash: oauthCrypto.hashOAuthState(token),
    });
    prisma.adminModel.findFirst.mockResolvedValue({ id: `admin-1`, email: `admin@example.com`, type: `ADMIN` });
    prisma.consumerModel.findFirst.mockResolvedValue(null);

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
  });

  it(`rejects admin access tokens when the resolved admin has been deactivated`, async () => {
    const token = `admin-token`;
    const request: MockRequest = {
      method: `GET`,
      path: `/api/admin-v2/consumers`,
      url: `/api/admin-v2/consumers`,
      cookies: {
        [COOKIE_KEYS.ADMIN_ACCESS_TOKEN]: token,
      },
    };
    jwtService.verify.mockReturnValue({
      identityId: `admin-1`,
      sid: `session-1`,
      typ: `access`,
      scope: `admin`,
    });
    prisma.adminAuthSessionModel.findFirst.mockResolvedValue({
      id: `session-1`,
      adminId: `admin-1`,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      accessTokenHash: oauthCrypto.hashOAuthState(token),
    });
    prisma.adminModel.findFirst.mockResolvedValue(null);
    prisma.consumerModel.findFirst.mockResolvedValue(null);

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(`Authentication record not found`);
    expect(prisma.adminModel.findFirst).toHaveBeenCalledWith({ where: { id: `admin-1`, deletedAt: null } });
  });

  it(`uses the mobile consumer namespace selected by explicit app scope`, async () => {
    const [mobileAccessCookieKey] = getApiConsumerAccessTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
    const [mobileCsrfCookieKey] = getApiConsumerCsrfTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
    const request: MockRequest = {
      method: `POST`,
      path: `/api/consumer/profile`,
      url: `/api/consumer/profile`,
      headers: {
        origin: `https://mobile.example.com`,
        [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE,
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
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });
    prisma.authSessionModel.findFirst.mockResolvedValue({
      id: `session-1`,
      consumerId: `consumer-1`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
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
