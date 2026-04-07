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

import { ConsumerAuthService } from './auth.service';
import { envs } from '../../envs';
import { AuthAuditService } from '../../shared/auth-audit.service';
import { MailingService } from '../../shared/mailing.service';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { PrismaService } from '../../shared/prisma.service';

const mockHashOAuthState = oauthCrypto.hashOAuthState as jest.MockedFunction<typeof oauthCrypto.hashOAuthState>;

describe(`ConsumerAuthService.issueTokensForConsumer`, () => {
  let service: ConsumerAuthService;
  let prisma: {
    authSessionModel: { create: jest.Mock; update: jest.Mock };
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
      providers: [
        ConsumerAuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: MailingService, useValue: { sendConsumerSignupVerificationEmail: jest.fn() } },
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
      ],
    }).compile();

    service = module.get(ConsumerAuthService);
  });

  it(`stores both access and refresh token hashes on the created auth session`, async () => {
    const result = await service.issueTokensForConsumer(`consumer-1`, `consumer`);

    expect(result).toEqual({
      accessToken: `access-token`,
      refreshToken: `refresh-token`,
      sessionId: `session-1`,
      sessionFamilyId: `session-1`,
    });
    expect(prisma.authSessionModel.create).toHaveBeenCalledWith({
      data: {
        consumerId: `consumer-1`,
        appScope: `consumer`,
        sessionFamilyId: `consumer-1`,
        refreshTokenHash: expect.stringMatching(/^pending:/),
        expiresAt: expect.any(Date),
      },
    });
    expect(prisma.authSessionModel.update).toHaveBeenCalledWith({
      where: { id: `session-1` },
      data: {
        accessTokenHash: `hash-access-token`,
        sessionFamilyId: `session-1`,
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
