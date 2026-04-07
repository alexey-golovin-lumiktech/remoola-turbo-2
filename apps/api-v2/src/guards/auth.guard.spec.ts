import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { type ExecutionContext } from '@nestjs/common/interfaces/features/execution-context.interface';
import { type Reflector } from '@nestjs/core';
import { type JwtService } from '@nestjs/jwt';

import { CONSUMER_APP_SCOPE_HEADER, COOKIE_KEYS } from '@remoola/api-types';
import { oauthCrypto } from '@remoola/security-utils';

import { type IDENTITY } from '../common';
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
      value === `consumer` || value === `consumer-mobile` || value === `consumer-css-grid` ? value : undefined,
    );
    originResolver.validateConsumerAppScopeHeader.mockImplementation((value?: string | string[]) => {
      const headerValue = Array.isArray(value) ? value[0] : value;
      return headerValue === `consumer` || headerValue === `consumer-mobile` || headerValue === `consumer-css-grid`
        ? headerValue
        : undefined;
    });
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
      headers: { [CONSUMER_APP_SCOPE_HEADER]: `consumer` },
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

  it(`rejects consumer requests without an explicit app scope`, async () => {
    const [consumerAccessCookieKey] = getApiConsumerAccessTokenCookieKeysForRead(`consumer`);
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
    const [consumerAccessCookieKey] = getApiConsumerAccessTokenCookieKeysForRead(`consumer`);
    const request: MockRequest = {
      path: `/api/consumer/profile`,
      url: `/api/consumer/profile`,
      headers: { [CONSUMER_APP_SCOPE_HEADER]: `consumer` },
      cookies: {
        [consumerAccessCookieKey]: token,
      },
    };
    jwtService.verify.mockReturnValue({
      identityId: `consumer-1`,
      sid: `session-1`,
      typ: `access`,
      scope: `consumer`,
      appScope: `consumer`,
    });
    prisma.authSessionModel.findFirst.mockResolvedValue({
      id: `session-1`,
      consumerId: `consumer-1`,
      appScope: `consumer`,
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
      headers: { [CONSUMER_APP_SCOPE_HEADER]: `consumer` },
      cookies: {
        [consumerAccessCookieKey]: `token`,
      },
    };
    jwtService.verify.mockReturnValue({
      identityId: `consumer-1`,
      sid: `session-1`,
      typ: `access`,
      scope: `consumer`,
      appScope: `consumer`,
    });
    prisma.authSessionModel.findFirst.mockResolvedValue({
      id: `session-1`,
      consumerId: `consumer-1`,
      appScope: `consumer`,
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
        [CONSUMER_APP_SCOPE_HEADER]: `consumer`,
      },
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
      headers: { [CONSUMER_APP_SCOPE_HEADER]: `consumer` },
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
    const [consumerAccessCookieKey] = getApiConsumerAccessTokenCookieKeysForRead(`consumer`);
    const request: MockRequest = {
      path: `/api/consumer/profile`,
      url: `/api/consumer/profile`,
      headers: { [CONSUMER_APP_SCOPE_HEADER]: `consumer` },
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
    const [consumerAccessCookieKey] = getApiConsumerAccessTokenCookieKeysForRead(`consumer`);
    const request: MockRequest = {
      method: `POST`,
      path: `/api/consumer/profile`,
      url: `/api/consumer/profile`,
      headers: {
        origin: `https://consumer.example.com`,
        [CONSUMER_APP_SCOPE_HEADER]: `consumer`,
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
      appScope: `consumer`,
    });
    prisma.authSessionModel.findFirst.mockResolvedValue({
      id: `session-1`,
      consumerId: `consumer-1`,
      appScope: `consumer`,
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
      headers: {
        origin: `https://consumer.example.com`,
        [CONSUMER_APP_SCOPE_HEADER]: `consumer`,
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
      appScope: `consumer`,
    });
    prisma.authSessionModel.findFirst.mockResolvedValue({
      id: `session-1`,
      consumerId: `consumer-1`,
      appScope: `consumer`,
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

  it(`uses the mobile consumer namespace selected by explicit app scope`, async () => {
    const [mobileAccessCookieKey] = getApiConsumerAccessTokenCookieKeysForRead(`consumer-mobile`);
    const [mobileCsrfCookieKey] = getApiConsumerCsrfTokenCookieKeysForRead(`consumer-mobile`);
    const request: MockRequest = {
      method: `POST`,
      path: `/api/consumer/profile`,
      url: `/api/consumer/profile`,
      headers: {
        origin: `https://mobile.example.com`,
        [CONSUMER_APP_SCOPE_HEADER]: `consumer-mobile`,
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
      appScope: `consumer-mobile`,
    });
    prisma.authSessionModel.findFirst.mockResolvedValue({
      id: `session-1`,
      consumerId: `consumer-1`,
      appScope: `consumer-mobile`,
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
