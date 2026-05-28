import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';

jest.mock(`@remoola/security-utils`, () => ({
  hashTokenToHex: jest.fn<(...a: any[]) => any>((token: string) => `hex-${token}`),
  newUuid: jest.fn<(...a: any[]) => any>(() => `00000000-0000-4000-8000-000000000000`),
  oauthCrypto: {
    generateOAuthState: jest.fn<(...a: any[]) => any>(() => `generated-state`),
    hashOAuthState: jest.fn<(...a: any[]) => any>((token: string) => `hash-${token}`),
  },
}));

jest.mock(`../../shared-common`, () => ({
  passwordUtils: {
    verifyPassword: jest.fn<(...a: any[]) => any>(),
  },
  secureCompare: jest.fn<(...a: any[]) => any>((a: string, b: string) => a === b),
}));

import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerAuthService } from './auth.service';
import { consumerAuthServiceTestProviders } from './consumer-auth-testing.providers';
import { envs } from '../../envs';
import { AdminNotificationMailingService } from '../../shared/admin-notification-mailing.service';
import { AuthAuditService, AUTH_AUDIT_EVENTS, AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { PrismaService } from '../../shared/prisma.service';
import { RecoveryMailingService } from '../../shared/recovery-mailing.service';
import { SignupMailingService } from '../../shared/signup-mailing.service';
import { passwordUtils } from '../../shared-common';

const mockVerifyPassword = passwordUtils.verifyPassword as jest.MockedFunction<typeof passwordUtils.verifyPassword>;

describe(`ConsumerAuthService.login`, () => {
  let service: ConsumerAuthService;
  let prisma: {
    consumerModel: { findFirst: jest.Mock<(...a: any[]) => any> };
    authSessionModel: { create: jest.Mock<(...a: any[]) => any>; update: jest.Mock<(...a: any[]) => any> };
    $transaction: jest.Mock<(...a: any[]) => any>;
  };
  let jwtService: { signAsync: jest.Mock<(...a: any[]) => any> };
  let authAudit: {
    checkLockoutAndRateLimit: jest.Mock<(...a: any[]) => any>;
    recordAudit: jest.Mock<(...a: any[]) => any>;
    recordFailedAttempt: jest.Mock<(...a: any[]) => any>;
    clearLockout: jest.Mock<(...a: any[]) => any>;
  };

  const body = { email: `user@example.com`, password: `secret-password` };
  const appScope = CURRENT_CONSUMER_APP_SCOPE;
  const identity = {
    id: `consumer-id`,
    email: `user@example.com`,
    password: `stored-hash`,
    salt: `stored-salt`,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prisma = {
      consumerModel: { findFirst: jest.fn<(...a: any[]) => any>() },
      authSessionModel: {
        create: jest.fn<(...a: any[]) => any>().mockResolvedValue({ id: `session-1` }),
        update: jest.fn<(...a: any[]) => any>().mockResolvedValue({ id: `session-1` }),
      },
      $transaction: jest
        .fn<(...a: any[]) => any>()
        .mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)),
    };
    jwtService = {
      signAsync: jest
        .fn<(...a: any[]) => any>()
        .mockImplementation(async (payload: { typ?: string }, options?: { secret?: string }) =>
          payload.typ === `access`
            ? `access-token`
            : `${options?.secret === envs.JWT_REFRESH_SECRET ? `refresh` : `legacy`}-token`,
        ),
    };
    authAudit = {
      checkLockoutAndRateLimit: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
      recordAudit: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
      recordFailedAttempt: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
      clearLockout: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: consumerAuthServiceTestProviders([
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: RecoveryMailingService, useValue: {} },
        { provide: AdminNotificationMailingService, useValue: {} },
        { provide: SignupMailingService, useValue: {} },
        { provide: AuthAuditService, useValue: authAudit },
        {
          provide: OriginResolverService,
          useValue: {
            getAllowedOrigins: jest.fn<(...a: any[]) => any>(),
          },
        },
      ]),
    }).compile();

    service = module.get(ConsumerAuthService);
  });

  it(`throws UnauthorizedException when consumer is not found`, async () => {
    prisma.consumerModel.findFirst.mockResolvedValue(null);

    await expect(service.login(body, appScope)).rejects.toThrow(UnauthorizedException);
    await expect(service.login(body, appScope)).rejects.toMatchObject({
      response: expect.objectContaining({ message: errorCodes.INVALID_CREDENTIALS }),
    });
    expect(mockVerifyPassword).not.toHaveBeenCalled();
    expect(authAudit.recordFailedAttempt).not.toHaveBeenCalled();
  });

  it(`treats legacy consumers with missing salt as invalid credentials without hashing`, async () => {
    prisma.consumerModel.findFirst.mockResolvedValue({ ...identity, salt: null });

    await expect(service.login(body, appScope)).rejects.toThrow(UnauthorizedException);
    await expect(service.login(body, appScope)).rejects.toMatchObject({
      response: expect.objectContaining({ message: errorCodes.INVALID_CREDENTIALS }),
    });
    expect(mockVerifyPassword).not.toHaveBeenCalled();
    expect(authAudit.recordAudit).toHaveBeenCalledWith({
      identityType: AUTH_IDENTITY_TYPES.consumer,
      identityId: identity.id,
      email: identity.email,
      event: AUTH_AUDIT_EVENTS.login_failure,
      ipAddress: undefined,
      userAgent: undefined,
    });
    expect(authAudit.recordFailedAttempt).toHaveBeenCalledWith(AUTH_IDENTITY_TYPES.consumer, identity.email);
  });

  it(`throws UnauthorizedException when password is invalid`, async () => {
    prisma.consumerModel.findFirst.mockResolvedValue(identity);
    mockVerifyPassword.mockResolvedValue(false);

    await expect(service.login(body, appScope)).rejects.toThrow(UnauthorizedException);
    await expect(service.login(body, appScope)).rejects.toMatchObject({
      response: expect.objectContaining({ message: errorCodes.INVALID_CREDENTIALS }),
    });
    expect(mockVerifyPassword).toHaveBeenCalledWith({
      password: body.password,
      storedHash: identity.password,
      storedSalt: identity.salt,
    });
    expect(authAudit.recordFailedAttempt).toHaveBeenCalledWith(AUTH_IDENTITY_TYPES.consumer, identity.email);
  });

  it(`returns identity and tokens when credentials are valid`, async () => {
    prisma.consumerModel.findFirst.mockResolvedValue(identity);
    mockVerifyPassword.mockResolvedValue(true);

    const result = await service.login(body, appScope);
    const sessionId = prisma.authSessionModel.create.mock.calls[0][0].data.id as string;

    expect(result).toMatchObject({
      identity: { id: identity.id, email: identity.email },
      accessToken: `access-token`,
      refreshToken: `refresh-token`,
      sessionId,
      sessionFamilyId: sessionId,
    });
    expect(authAudit.clearLockout).toHaveBeenCalledWith(AUTH_IDENTITY_TYPES.consumer, identity.email);
    expect(authAudit.recordFailedAttempt).not.toHaveBeenCalled();
  });
});
