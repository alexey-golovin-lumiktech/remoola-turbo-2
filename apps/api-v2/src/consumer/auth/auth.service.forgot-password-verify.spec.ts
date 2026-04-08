import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import { type Response } from 'express';

import { errorCodes } from '@remoola/shared-constants';

import { ConsumerAuthService } from './auth.service';
import { AuthAuditService } from '../../shared/auth-audit.service';
import { MailingService } from '../../shared/mailing.service';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { PrismaService } from '../../shared/prisma.service';

describe(`ConsumerAuthService.validateForgotPasswordTokenAndRedirect`, () => {
  let service: ConsumerAuthService;
  let prisma: {
    resetPasswordModel: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      resetPasswordModel: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsumerAuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { signAsync: jest.fn(), verify: jest.fn(), decode: jest.fn() } },
        { provide: MailingService, useValue: {} },
        { provide: AuthAuditService, useValue: { recordAudit: jest.fn() } },
        {
          provide: OriginResolverService,
          useValue: {
            validateConsumerAppScope: jest.fn((scope?: string | null) =>
              scope === `consumer` || scope === `consumer-mobile` || scope === `consumer-css-grid` ? scope : undefined,
            ),
            resolveConsumerOriginByScope: jest.fn((scope: string) => {
              if (scope === `consumer-mobile`) return `https://mobile.example.com`;
              if (scope === `consumer-css-grid`) return `https://grid.example.com`;
              return `https://app.example.com`;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(ConsumerAuthService);
  });

  it(`redirects valid tokens to the stored app scope confirm page with token only`, async () => {
    prisma.resetPasswordModel.findFirst.mockResolvedValue({
      appScope: `consumer-mobile`,
      deletedAt: null,
      expiredAt: new Date(Date.now() + 60_000),
    });
    const res = { redirect: jest.fn() } as unknown as Response;

    await service.validateForgotPasswordTokenAndRedirect(`reset-token`, res);

    expect(res.redirect).toHaveBeenCalledWith(`https://mobile.example.com/forgot-password/confirm?token=reset-token`);
  });

  it(`redirects expired tokens to the stored app scope without preserving token`, async () => {
    prisma.resetPasswordModel.findFirst.mockResolvedValue({
      appScope: `consumer-css-grid`,
      deletedAt: null,
      expiredAt: new Date(Date.now() - 60_000),
    });
    const res = { redirect: jest.fn() } as unknown as Response;

    await service.validateForgotPasswordTokenAndRedirect(`expired-token`, res);

    expect(res.redirect).toHaveBeenCalledWith(`https://grid.example.com/forgot-password/confirm`);
  });

  it(`rejects invalid tokens when no stored app scope is available`, async () => {
    prisma.resetPasswordModel.findFirst.mockResolvedValue(null);
    const res = { redirect: jest.fn() } as unknown as Response;

    await expect(service.validateForgotPasswordTokenAndRedirect(`invalid-token`, res)).rejects.toMatchObject({
      response: { message: errorCodes.ORIGIN_REQUIRED },
    });
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
