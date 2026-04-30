/* eslint-disable import/order */
import { Test, type TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';
import { errorCodes } from '@remoola/shared-constants';

jest.mock(`@remoola/security-utils`, () => ({
  hashTokenToHex: jest.fn((token: string) => `hash-${token}`),
  oauthCrypto: {
    generateOAuthState: jest.fn(() => `generated-token`),
  },
}));
jest.mock(`../../shared/resolve-email-api-base-url`, () => ({
  resolveEmailApiBaseUrl: jest.fn(() => `http://127.0.0.1:3334/api`),
}));

import { hashTokenToHex, oauthCrypto } from '@remoola/security-utils';

import { ConsumerAuthService } from './auth.service.spec-wrapper';
import { AuthAuditService } from '../../shared/auth-audit.service';
import { MailingService } from '../../shared/mailing.service';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { PrismaService } from '../../shared/prisma.service';

const mockHashTokenToHex = hashTokenToHex as jest.MockedFunction<typeof hashTokenToHex>;
const mockGenerateOAuthState = oauthCrypto.generateOAuthState as jest.MockedFunction<
  typeof oauthCrypto.generateOAuthState
>;

describe(`ConsumerAuthService.requestPasswordReset`, () => {
  let service: ConsumerAuthService;
  let prisma: {
    consumerModel: { findFirst: jest.Mock };
    resetPasswordModel: { findFirst: jest.Mock; updateMany: jest.Mock; create: jest.Mock };
  };
  let mailingService: {
    sendConsumerForgotPasswordEmail: jest.Mock;
    sendConsumerPasswordlessRecoveryEmail: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockGenerateOAuthState.mockReturnValue(`generated-token`);
    mockHashTokenToHex.mockImplementation((token: string) => `hash-${token}`);

    prisma = {
      consumerModel: {
        findFirst: jest.fn(),
      },
      resetPasswordModel: {
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({ id: `reset-row-id` }),
      },
    };
    mailingService = {
      sendConsumerForgotPasswordEmail: jest.fn().mockResolvedValue(undefined),
      sendConsumerPasswordlessRecoveryEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsumerAuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { signAsync: jest.fn(), verify: jest.fn(), decode: jest.fn() } },
        { provide: MailingService, useValue: mailingService },
        { provide: AuthAuditService, useValue: { recordAudit: jest.fn(), checkLockoutAndRateLimit: jest.fn() } },
        {
          provide: OriginResolverService,
          useValue: {
            validateConsumerAppScope: jest.fn((scope?: string | null) =>
              scope === CURRENT_CONSUMER_APP_SCOPE ? CURRENT_CONSUMER_APP_SCOPE : undefined,
            ),
            resolveConsumerOriginByScope: jest.fn((scope?: string) => {
              if (scope === CURRENT_CONSUMER_APP_SCOPE) return `http://127.0.0.1:3001`;
              return undefined;
            }),
            getAllowedOrigins: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ConsumerAuthService);
  });

  it(`returns unknown_or_unsupported for emails that do not match a consumer`, async () => {
    prisma.consumerModel.findFirst.mockResolvedValue(null);

    await expect(service.requestPasswordReset(`missing@example.com`, CURRENT_CONSUMER_APP_SCOPE)).resolves.toBe(
      `unknown_or_unsupported`,
    );
    expect(mailingService.sendConsumerForgotPasswordEmail).not.toHaveBeenCalled();
    expect(mailingService.sendConsumerPasswordlessRecoveryEmail).not.toHaveBeenCalled();
    expect(prisma.resetPasswordModel.create).not.toHaveBeenCalled();
  });

  it.each([[CURRENT_CONSUMER_APP_SCOPE, `http://127.0.0.1:3001/login?auth_notice=google_signin_required`]] as const)(
    `sends Google sign-in guidance for passwordless consumers in %s scope`,
    async (appScope, loginUrl) => {
      prisma.consumerModel.findFirst.mockResolvedValue({
        id: `consumer-id`,
        email: `google-only@example.com`,
        password: null,
        salt: null,
      });

      await expect(service.requestPasswordReset(`google-only@example.com`, appScope)).resolves.toBe(
        `provider_guidance_email_sent`,
      );
      expect(mailingService.sendConsumerPasswordlessRecoveryEmail).toHaveBeenCalledWith({
        email: `google-only@example.com`,
        loginUrl,
      });
      expect(mailingService.sendConsumerForgotPasswordEmail).not.toHaveBeenCalled();
      expect(prisma.resetPasswordModel.create).not.toHaveBeenCalled();
    },
  );

  it.each([[CURRENT_CONSUMER_APP_SCOPE]] as const)(
    `creates a reset token and sends the standard email for password-backed consumers in %s scope`,
    async (appScope) => {
      prisma.consumerModel.findFirst.mockResolvedValue({
        id: `consumer-id`,
        email: `user@example.com`,
        password: `stored-hash`,
        salt: `stored-salt`,
      });

      await expect(service.requestPasswordReset(`user@example.com`, appScope)).resolves.toBe(
        `password_reset_email_sent`,
      );
      expect(mockGenerateOAuthState).toHaveBeenCalled();
      expect(prisma.resetPasswordModel.updateMany).toHaveBeenCalledWith({
        where: { consumerId: `consumer-id`, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
      expect(prisma.resetPasswordModel.create).toHaveBeenCalledWith({
        data: {
          consumerId: `consumer-id`,
          appScope,
          tokenHash: `hash-generated-token`,
          expiredAt: expect.any(Date),
        },
      });
      expect(mailingService.sendConsumerForgotPasswordEmail).toHaveBeenCalledWith({
        email: `user@example.com`,
        forgotPasswordLink: `http://127.0.0.1:3334/api/consumer/auth/forgot-password/verify?token=generated-token`,
      });
    },
  );

  it(`preserves cooldown by skipping new token creation and email sends`, async () => {
    prisma.consumerModel.findFirst.mockResolvedValue({
      id: `consumer-id`,
      email: `user@example.com`,
      password: `stored-hash`,
      salt: `stored-salt`,
    });
    prisma.resetPasswordModel.findFirst.mockResolvedValue({ id: `cooldown-hit` });

    await expect(service.requestPasswordReset(`user@example.com`, CURRENT_CONSUMER_APP_SCOPE)).resolves.toBe(
      `cooldown_noop`,
    );
    expect(prisma.resetPasswordModel.create).not.toHaveBeenCalled();
    expect(mailingService.sendConsumerForgotPasswordEmail).not.toHaveBeenCalled();
    expect(mailingService.sendConsumerPasswordlessRecoveryEmail).not.toHaveBeenCalled();
  });

  it(`rejects password reset requests without a valid app scope`, async () => {
    prisma.consumerModel.findFirst.mockResolvedValue({
      id: `consumer-id`,
      email: `user@example.com`,
      password: `stored-hash`,
      salt: `stored-salt`,
    });

    await expect(service.requestPasswordReset(`user@example.com`, undefined as never)).rejects.toMatchObject({
      response: { message: errorCodes.ORIGIN_REQUIRED },
    });
    expect(prisma.resetPasswordModel.create).not.toHaveBeenCalled();
    expect(mailingService.sendConsumerForgotPasswordEmail).not.toHaveBeenCalled();
  });
});
