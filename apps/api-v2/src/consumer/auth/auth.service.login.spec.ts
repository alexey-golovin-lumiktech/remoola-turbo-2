import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';

jest.mock(`@remoola/security-utils`, () => ({
  hashTokenToHex: jest.fn((token: string) => `hex-${token}`),
  oauthCrypto: {
    generateOAuthState: jest.fn(() => `generated-state`),
    hashOAuthState: jest.fn((token: string) => `hash-${token}`),
  },
}));

jest.mock(`../../shared-common`, () => ({
  passwordUtils: {
    verifyPassword: jest.fn(),
  },
  secureCompare: jest.fn((a: string, b: string) => a === b),
}));

import { errorCodes } from '@remoola/shared-constants';

import { ConsumerAuthService } from './auth.service';
import { envs } from '../../envs';
import { AuthAuditService, AUTH_AUDIT_EVENTS, AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';
import { MailingService } from '../../shared/mailing.service';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { PrismaService } from '../../shared/prisma.service';
import { passwordUtils } from '../../shared-common';

const mockVerifyPassword = passwordUtils.verifyPassword as jest.MockedFunction<typeof passwordUtils.verifyPassword>;

describe(`ConsumerAuthService.login`, () => {
  let service: ConsumerAuthService;
  let prisma: {
    consumerModel: { findFirst: jest.Mock };
    authSessionModel: { create: jest.Mock; update: jest.Mock };
  };
  let jwtService: { signAsync: jest.Mock };
  let authAudit: {
    checkLockoutAndRateLimit: jest.Mock;
    recordAudit: jest.Mock;
    recordFailedAttempt: jest.Mock;
    clearLockout: jest.Mock;
  };

  const body = { email: `user@example.com`, password: `secret-password` };
  const appScope = `consumer` as const;
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
      consumerModel: { findFirst: jest.fn() },
      authSessionModel: {
        create: jest.fn().mockResolvedValue({ id: `session-1` }),
        update: jest.fn().mockResolvedValue({ id: `session-1` }),
      },
    };
    jwtService = {
      signAsync: jest
        .fn()
        .mockImplementation(async (payload: { typ?: string }, options?: { secret?: string }) =>
          payload.typ === `access`
            ? `access-token`
            : `${options?.secret === envs.JWT_REFRESH_SECRET ? `refresh` : `legacy`}-token`,
        ),
    };
    authAudit = {
      checkLockoutAndRateLimit: jest.fn().mockResolvedValue(undefined),
      recordAudit: jest.fn().mockResolvedValue(undefined),
      recordFailedAttempt: jest.fn().mockResolvedValue(undefined),
      clearLockout: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsumerAuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: MailingService, useValue: { sendConsumerSignupVerificationEmail: jest.fn() } },
        { provide: AuthAuditService, useValue: authAudit },
        {
          provide: OriginResolverService,
          useValue: {
            getAllowedOrigins: jest.fn(),
          },
        },
      ],
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

    expect(result).toMatchObject({
      identity: { id: identity.id, email: identity.email },
      accessToken: `access-token`,
      refreshToken: `refresh-token`,
      sessionId: `session-1`,
      sessionFamilyId: `session-1`,
    });
    expect(authAudit.clearLockout).toHaveBeenCalledWith(AUTH_IDENTITY_TYPES.consumer, identity.email);
    expect(authAudit.recordFailedAttempt).not.toHaveBeenCalled();
  });
});
