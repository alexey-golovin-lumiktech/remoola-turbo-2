import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import { type Response } from 'express';

import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerAuthService } from './auth.service';
import { consumerAuthServiceTestProviders } from './consumer-auth-testing.providers';
import { AdminNotificationMailingService } from '../../shared/admin-notification-mailing.service';
import { AuthAuditService } from '../../shared/auth-audit.service';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { PrismaService } from '../../shared/prisma.service';
import { RecoveryMailingService } from '../../shared/recovery-mailing.service';
import { SignupMailingService } from '../../shared/signup-mailing.service';

describe(`ConsumerAuthService.validateForgotPasswordTokenAndRedirect`, () => {
  let service: ConsumerAuthService;
  let prisma: {
    resetPasswordModel: { findFirst: jest.Mock<(...a: any[]) => any> };
  };

  beforeEach(async () => {
    prisma = {
      resetPasswordModel: {
        findFirst: jest.fn<(...a: any[]) => any>(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: consumerAuthServiceTestProviders([
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn<(...a: any[]) => any>(),
            verify: jest.fn<(...a: any[]) => any>(),
            decode: jest.fn<(...a: any[]) => any>(),
          },
        },
        { provide: RecoveryMailingService, useValue: {} },
        { provide: AdminNotificationMailingService, useValue: {} },
        { provide: SignupMailingService, useValue: {} },
        { provide: AuthAuditService, useValue: { recordAudit: jest.fn<(...a: any[]) => any>() } },
        {
          provide: OriginResolverService,
          useValue: {
            validateConsumerAppScope: jest.fn<(...a: any[]) => any>((scope?: string | null) =>
              scope === CURRENT_CONSUMER_APP_SCOPE ? CURRENT_CONSUMER_APP_SCOPE : undefined,
            ),
            resolveConsumerOriginByScope: jest.fn<(...a: any[]) => any>((scope: string) => {
              if (scope === CURRENT_CONSUMER_APP_SCOPE) return `https://grid.example.com`;
              return null;
            }),
          },
        },
      ]),
    }).compile();

    service = module.get(ConsumerAuthService);
  });

  it(`redirects valid tokens to the stored app scope confirm page with token only`, async () => {
    prisma.resetPasswordModel.findFirst.mockResolvedValue({
      appScope: CURRENT_CONSUMER_APP_SCOPE,
      deletedAt: null,
      expiredAt: new Date(Date.now() + 60_000),
    });
    const res = { redirect: jest.fn<(...a: any[]) => any>() } as unknown as Response;

    await service.validateForgotPasswordTokenAndRedirect(`reset-token`, res);

    expect(res.redirect).toHaveBeenCalledWith(`https://grid.example.com/forgot-password/confirm?token=reset-token`);
  });

  it(`redirects expired tokens to the stored app scope without preserving token`, async () => {
    prisma.resetPasswordModel.findFirst.mockResolvedValue({
      appScope: CURRENT_CONSUMER_APP_SCOPE,
      deletedAt: null,
      expiredAt: new Date(Date.now() - 60_000),
    });
    const res = { redirect: jest.fn<(...a: any[]) => any>() } as unknown as Response;

    await service.validateForgotPasswordTokenAndRedirect(`expired-token`, res);

    expect(res.redirect).toHaveBeenCalledWith(`https://grid.example.com/forgot-password/confirm`);
  });

  it(`rejects invalid tokens when no stored app scope is available`, async () => {
    prisma.resetPasswordModel.findFirst.mockResolvedValue(null);
    const res = { redirect: jest.fn<(...a: any[]) => any>() } as unknown as Response;

    await expect(service.validateForgotPasswordTokenAndRedirect(`invalid-token`, res)).rejects.toMatchObject({
      response: { message: errorCodes.ORIGIN_REQUIRED },
    });
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
