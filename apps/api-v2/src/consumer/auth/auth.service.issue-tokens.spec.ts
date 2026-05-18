/* eslint-disable import/order */
import { Test, type TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';

jest.mock(`@remoola/security-utils`, () => ({
  hashTokenToHex: jest.fn((token: string) => `hex-${token}`),
  oauthCrypto: {
    generateOAuthState: jest.fn(() => `generated-state`),
    hashOAuthState: jest.fn((token: string) => `hash-${token}`),
  },
}));

import { oauthCrypto } from '@remoola/security-utils';
import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';

import { ConsumerAuthService } from './auth.service';
import { consumerAuthServiceTestProviders } from './consumer-auth-testing.providers';
import { envs } from '../../envs';
import { AdminNotificationMailingService } from '../../shared/admin-notification-mailing.service';
import { AuthAuditService } from '../../shared/auth-audit.service';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { PrismaService } from '../../shared/prisma.service';
import { RecoveryMailingService } from '../../shared/recovery-mailing.service';
import { SignupMailingService } from '../../shared/signup-mailing.service';

const mockHashOAuthState = oauthCrypto.hashOAuthState as jest.MockedFunction<typeof oauthCrypto.hashOAuthState>;

describe(`ConsumerAuthService.issueTokensForConsumer`, () => {
  let service: ConsumerAuthService;
  let prisma: {
    authSessionModel: { create: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockHashOAuthState.mockImplementation((token: string) => `hash-${token}`);

    prisma = {
      authSessionModel: {
        create: jest.fn().mockResolvedValue({ id: `session-1` }),
        update: jest.fn().mockResolvedValue({ id: `session-1` }),
      },
      $transaction: jest.fn().mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)),
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
            recordAudit: jest.fn(),
            checkLockoutAndRateLimit: jest.fn(),
            clearLockout: jest.fn(),
          },
        },
        {
          provide: OriginResolverService,
          useValue: {
            getAllowedOrigins: jest.fn(),
          },
        },
      ]),
    }).compile();

    service = module.get(ConsumerAuthService);
  });

  it(`stores both access and refresh token hashes on the created auth session`, async () => {
    const result = await service.issueTokensForConsumer(`consumer-1`, CURRENT_CONSUMER_APP_SCOPE);
    const sessionId = prisma.authSessionModel.create.mock.calls[0][0].data.id as string;

    expect(result).toEqual({
      accessToken: `access-token`,
      refreshToken: `refresh-token`,
      sessionId,
      sessionFamilyId: sessionId,
    });
    expect(prisma.authSessionModel.create).toHaveBeenCalledWith({
      data: {
        id: sessionId,
        consumerId: `consumer-1`,
        appScope: CURRENT_CONSUMER_APP_SCOPE,
        sessionFamilyId: sessionId,
        refreshTokenHash: expect.stringMatching(/^pending:/),
        expiresAt: expect.any(Date),
      },
    });
    expect(prisma.authSessionModel.update).toHaveBeenCalledWith({
      where: { id: sessionId },
      data: {
        accessTokenHash: `hash-access-token`,
        sessionFamilyId: sessionId,
        refreshTokenHash: `hash-refresh-token`,
        lastUsedAt: expect.any(Date),
      },
    });
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ typ: `refresh` }),
      expect.objectContaining({ secret: envs.JWT_REFRESH_SECRET }),
    );
  });
});
