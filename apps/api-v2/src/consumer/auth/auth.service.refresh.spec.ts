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
  secureCompare: jest.fn<(...a: any[]) => any>((left: string, right: string) => left === right),
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

describe(`ConsumerAuthService.refreshAccess`, () => {
  let service: ConsumerAuthService;
  let prisma: {
    authSessionModel: {
      create: jest.Mock<(...a: any[]) => any>;
      findFirst: jest.Mock<(...a: any[]) => any>;
      update: jest.Mock<(...a: any[]) => any>;
      updateMany: jest.Mock<(...a: any[]) => any>;
    };
    consumerModel: { findFirst: jest.Mock<(...a: any[]) => any> };
    $transaction: jest.Mock<(...a: any[]) => any>;
  };
  let authAudit: {
    recordAudit: jest.Mock<(...a: any[]) => any>;
  };
  let jwtService: { verify: jest.Mock<(...a: any[]) => any>; signAsync: jest.Mock<(...a: any[]) => any> };

  beforeEach(async () => {
    prisma = {
      authSessionModel: {
        create: jest.fn<(...a: any[]) => any>(),
        findFirst: jest.fn<(...a: any[]) => any>(),
        update: jest.fn<(...a: any[]) => any>(),
        updateMany: jest.fn<(...a: any[]) => any>().mockResolvedValue({ count: 2 }),
      },
      consumerModel: {
        findFirst: jest.fn<(...a: any[]) => any>(),
      },
      $transaction: jest.fn<(...a: any[]) => any>(),
    };
    authAudit = {
      recordAudit: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
    };
    jwtService = {
      verify: jest.fn<(...a: any[]) => any>(),
      signAsync: jest.fn<(...a: any[]) => any>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: consumerAuthServiceTestProviders([
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: RecoveryMailingService, useValue: {} },
        { provide: AdminNotificationMailingService, useValue: {} },
        { provide: SignupMailingService, useValue: {} },
        {
          provide: AuthAuditService,
          useValue: {
            recordAudit: authAudit.recordAudit,
            checkLockoutAndRateLimit: jest.fn<(...a: any[]) => any>(),
            clearLockout: jest.fn<(...a: any[]) => any>(),
            recordFailedAttempt: jest.fn<(...a: any[]) => any>(),
          },
        },
        {
          provide: OriginResolverService,
          useValue: {
            validateConsumerAppScope: jest.fn<(...a: any[]) => any>((value?: string | null) =>
              value === CURRENT_CONSUMER_APP_SCOPE ? CURRENT_CONSUMER_APP_SCOPE : undefined,
            ),
            getAllowedOrigins: jest.fn<(...a: any[]) => any>().mockReturnValue(new Set()),
          },
        },
      ]),
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
    const txCreate = jest.fn<(...a: any[]) => any>().mockResolvedValue({ id: `session-2` });
    const txUpdate = jest.fn<(...a: any[]) => any>().mockResolvedValue({ id: `session-2` });
    const txUpdateMany = jest.fn<(...a: any[]) => any>().mockResolvedValue({ count: 0 });
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
