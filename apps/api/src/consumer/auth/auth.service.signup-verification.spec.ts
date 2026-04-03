import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import { type Response } from 'express';

import { ConsumerAuthService } from './auth.service';
import { AuthAuditService } from '../../shared/auth-audit.service';
import { MailingService } from '../../shared/mailing.service';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { PrismaService } from '../../shared/prisma.service';

describe(`ConsumerAuthService.signupVerification`, () => {
  let service: ConsumerAuthService;
  let jwtService: { verify: jest.Mock };
  let prisma: {
    consumerModel: { findFirst: jest.Mock; update: jest.Mock };
  };
  let originResolver: { validateConsumerRedirectOrigin: jest.Mock };

  const allowedOrigin = `https://consumer.example`;
  const consumerId = `11111111-1111-1111-1111-111111111111`;

  beforeEach(async () => {
    jwtService = { verify: jest.fn() };
    prisma = {
      consumerModel: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    originResolver = {
      validateConsumerRedirectOrigin: jest.fn().mockReturnValue(allowedOrigin),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsumerAuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: MailingService, useValue: {} },
        { provide: AuthAuditService, useValue: { recordAudit: jest.fn() } },
        { provide: OriginResolverService, useValue: originResolver },
      ],
    }).compile();

    service = module.get(ConsumerAuthService);
  });

  it(`throws when referer origin is invalid`, async () => {
    originResolver.validateConsumerRedirectOrigin.mockReturnValue(null);
    const res = { redirect: jest.fn() } as unknown as Response;

    await expect(service.signupVerification(`tok`, res, `bad`)).rejects.toThrow(BadRequestException);
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it(`redirects without DB update when JWT verification fails`, async () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error(`invalid`);
    });
    const res = { redirect: jest.fn() } as unknown as Response;

    await service.signupVerification(`bad.jwt`, res, allowedOrigin);

    expect(res.redirect).toHaveBeenCalledWith(`${allowedOrigin}/signup/verification?verified=no`);
    expect(prisma.consumerModel.findFirst).not.toHaveBeenCalled();
  });

  it(`redirects without DB update when token is a session-bound access JWT`, async () => {
    jwtService.verify.mockReturnValue({
      sub: consumerId,
      identityId: consumerId,
      typ: `access`,
      scope: `consumer`,
      sid: `session-row-id`,
    });
    const res = { redirect: jest.fn() } as unknown as Response;

    await service.signupVerification(`tok`, res, allowedOrigin);

    expect(res.redirect).toHaveBeenCalledWith(`${allowedOrigin}/signup/verification?verified=no`);
    expect(prisma.consumerModel.findFirst).not.toHaveBeenCalled();
  });

  it(`redirects without DB update when scope is not consumer`, async () => {
    jwtService.verify.mockReturnValue({
      sub: consumerId,
      identityId: consumerId,
      typ: `access`,
      scope: `admin`,
    });
    const res = { redirect: jest.fn() } as unknown as Response;

    await service.signupVerification(`tok`, res, allowedOrigin);

    expect(res.redirect).toHaveBeenCalledWith(`${allowedOrigin}/signup/verification?verified=no`);
    expect(prisma.consumerModel.findFirst).not.toHaveBeenCalled();
  });

  it(`marks consumer verified and keeps email in success redirect for compatibility`, async () => {
    jwtService.verify.mockReturnValue({
      sub: consumerId,
      identityId: consumerId,
      typ: `access`,
      scope: `consumer`,
    });
    prisma.consumerModel.findFirst.mockResolvedValue({
      id: consumerId,
      email: `u@example.com`,
    });
    prisma.consumerModel.update.mockResolvedValue({
      id: consumerId,
      email: `u@example.com`,
      verified: true,
    });
    const res = { redirect: jest.fn() } as unknown as Response;

    await service.signupVerification(`tok`, res, allowedOrigin);

    expect(prisma.consumerModel.update).toHaveBeenCalledWith({
      where: { id: consumerId },
      data: { verified: true },
    });
    const redirected = (res.redirect as jest.Mock).mock.calls[0][0] as string;
    expect(redirected).toContain(`/signup/verification`);
    // Link no longer carries `email`, but post-verify redirect intentionally may.
    expect(redirected).toContain(`email=`);
    expect(redirected).toContain(`verified=`);
  });
});
