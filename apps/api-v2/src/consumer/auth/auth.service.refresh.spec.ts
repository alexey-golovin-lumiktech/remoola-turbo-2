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
  secureCompare: jest.fn((left: string, right: string) => left === right),
}));

import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerAuthService } from './auth.service.spec-wrapper';
import { envs } from '../../envs';
import { AuthAuditService, AUTH_AUDIT_EVENTS, AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';
import { MailingService } from '../../shared/mailing.service';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { PrismaService } from '../../shared/prisma.service';

describe(`ConsumerAuthService.refreshAccess`, () => {
  let service: ConsumerAuthService;
  let prisma: {
    authSessionModel: { create: jest.Mock; findFirst: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
    consumerModel: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let authAudit: {
    recordAudit: jest.Mock;
  };
  let jwtService: { verify: jest.Mock; signAsync: jest.Mock };

  beforeEach(async () => {
    prisma = {
      authSessionModel: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      consumerModel: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    authAudit = {
      recordAudit: jest.fn().mockResolvedValue(undefined),
    };
    jwtService = {
      verify: jest.fn(),
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsumerAuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        {
          provide: MailingService,
          useValue: {
            sendConsumerSignupVerificationEmail: jest.fn(),
            sendProviderPasswordRecoveryGuidanceEmail: jest.fn(),
            sendConsumerPasswordResetEmail: jest.fn(),
          },
        },
        {
          provide: AuthAuditService,
          useValue: {
            recordAudit: authAudit.recordAudit,
            checkLockoutAndRateLimit: jest.fn(),
            clearLockout: jest.fn(),
            recordFailedAttempt: jest.fn(),
          },
        },
        {
          provide: OriginResolverService,
          useValue: {
            validateConsumerAppScope: jest.fn((value?: string | null) =>
              value === CURRENT_CONSUMER_APP_SCOPE ? CURRENT_CONSUMER_APP_SCOPE : undefined,
            ),
            getAllowedOrigins: jest.fn().mockReturnValue(new Set()),
          },
        },
      ],
    }).compile();

    service = module.get(ConsumerAuthService);
  });

  it(`revokes the whole session family and audits refresh reuse when a rotated token is replayed`, async () => {
    jwtService.verify.mockReturnValue({
      identityId: `consumer-1`,
      sid: `session-1`,
      typ: `refresh`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });
    prisma.authSessionModel.findFirst.mockResolvedValue({
      id: `session-1`,
      consumerId: `consumer-1`,
      sessionFamilyId: `family-1`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
      refreshTokenHash: `hash-current-refresh-token`,
      replacedById: `session-2`,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.consumerModel.findFirst.mockResolvedValue({
      id: `consumer-1`,
      email: `consumer@example.com`,
    });

    const action = service.refreshAccess(`replayed-refresh-token`, CURRENT_CONSUMER_APP_SCOPE);

    await expect(action).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(action).rejects.toMatchObject({
      response: expect.objectContaining({ message: errorCodes.INVALID_REFRESH_TOKEN }),
    });

    expect(prisma.authSessionModel.updateMany).toHaveBeenCalledWith({
      where: {
        sessionFamilyId: `family-1`,
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
        invalidatedReason: `refresh_reuse_detected`,
        lastUsedAt: expect.any(Date),
      },
    });
    expect(authAudit.recordAudit).toHaveBeenCalledWith({
      identityType: AUTH_IDENTITY_TYPES.consumer,
      identityId: `consumer-1`,
      email: `consumer@example.com`,
      event: AUTH_AUDIT_EVENTS.refresh_reuse,
      ipAddress: undefined,
      userAgent: undefined,
    });
  });

  it(`rejects refresh when the claimed app scope does not match the token app scope`, async () => {
    jwtService.verify.mockReturnValue({
      identityId: `consumer-1`,
      sid: `session-1`,
      typ: `refresh`,
      appScope: `unknown-scope`,
    });

    const action = service.refreshAccess(`refresh-token`, CURRENT_CONSUMER_APP_SCOPE);

    await expect(action).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(action).rejects.toMatchObject({
      response: expect.objectContaining({ message: errorCodes.INVALID_REFRESH_TOKEN }),
    });

    expect(prisma.authSessionModel.findFirst).not.toHaveBeenCalled();
    expect(authAudit.recordAudit).not.toHaveBeenCalled();
  });

  it(`treats a lost rotation compare-and-swap as refresh reuse`, async () => {
    jwtService.verify.mockReturnValue({
      identityId: `consumer-1`,
      sid: `session-1`,
      typ: `refresh`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });
    jwtService.signAsync.mockResolvedValueOnce(`access-token`).mockResolvedValueOnce(`refresh-token`);
    prisma.authSessionModel.findFirst.mockResolvedValue({
      id: `session-1`,
      consumerId: `consumer-1`,
      sessionFamilyId: `family-1`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
      refreshTokenHash: `hash-refresh-token`,
      replacedById: null,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.consumerModel.findFirst.mockResolvedValue({
      id: `consumer-1`,
      email: `consumer@example.com`,
      suspendedAt: null,
    });
    const txCreate = jest.fn().mockResolvedValue({ id: `session-2` });
    const txUpdate = jest.fn().mockResolvedValue({ id: `session-2` });
    const txUpdateMany = jest.fn().mockResolvedValue({ count: 0 });
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        authSessionModel: {
          create: txCreate,
          update: txUpdate,
          updateMany: txUpdateMany,
        },
      }),
    );

    await expect(service.refreshAccess(`refresh-token`, CURRENT_CONSUMER_APP_SCOPE)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(service.refreshAccess(`refresh-token`, CURRENT_CONSUMER_APP_SCOPE)).rejects.toMatchObject({
      response: expect.objectContaining({ message: errorCodes.INVALID_REFRESH_TOKEN }),
    });

    expect(txUpdateMany).toHaveBeenCalledWith({
      where: {
        id: `session-1`,
        consumerId: `consumer-1`,
        appScope: CURRENT_CONSUMER_APP_SCOPE,
        refreshTokenHash: `hash-refresh-token`,
        revokedAt: null,
        replacedById: null,
        expiresAt: { gte: expect.any(Date) },
      },
      data: expect.objectContaining({
        invalidatedReason: `rotated`,
        replacedById: expect.any(String),
      }),
    });
    expect(authAudit.recordAudit).toHaveBeenCalledWith({
      identityType: AUTH_IDENTITY_TYPES.consumer,
      identityId: `consumer-1`,
      email: `consumer@example.com`,
      event: AUTH_AUDIT_EVENTS.refresh_reuse,
      ipAddress: undefined,
      userAgent: undefined,
    });
    expect(authAudit.recordAudit).not.toHaveBeenCalledWith(
      expect.objectContaining({ event: AUTH_AUDIT_EVENTS.refresh_success }),
    );
    expect(prisma.authSessionModel.updateMany).toHaveBeenCalledWith({
      where: { sessionFamilyId: `family-1`, revokedAt: null },
      data: expect.objectContaining({ invalidatedReason: `refresh_reuse_detected` }),
    });
  });

  it(`revokes only the matching scoped session during logout cleanup`, async () => {
    jwtService.verify.mockReturnValue({
      identityId: `consumer-1`,
      sid: `session-1`,
      typ: `refresh`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });

    await service.revokeSessionByRefreshToken(`current-refresh-token`, CURRENT_CONSUMER_APP_SCOPE);

    expect(prisma.authSessionModel.updateMany).toHaveBeenCalledWith({
      where: {
        id: `session-1`,
        consumerId: `consumer-1`,
        appScope: CURRENT_CONSUMER_APP_SCOPE,
        refreshTokenHash: `hash-current-refresh-token`,
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
        invalidatedReason: `logout`,
        lastUsedAt: expect.any(Date),
      },
    });
  });
});
