import { type BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import { type Response } from 'express';

import { errorCodes } from '@remoola/shared-constants';

import { ConsumerAuthService } from './auth.service';
import { AuthAuditService } from '../../shared/auth-audit.service';
import { MailingService } from '../../shared/mailing.service';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { PrismaService } from '../../shared/prisma.service';

describe(`ConsumerAuthService.signupVerification`, () => {
  let service: ConsumerAuthService;
  let jwtService: { verify: jest.Mock; decode: jest.Mock };
  let prisma: {
    consumerModel: { findFirst: jest.Mock; update: jest.Mock };
  };
  let originResolver: {
    validateConsumerAppScope: jest.Mock;
    resolveConsumerOriginByScope: jest.Mock;
  };

  const consumerId = `11111111-1111-1111-1111-111111111111`;

  beforeEach(async () => {
    jwtService = { verify: jest.fn(), decode: jest.fn() };
    prisma = {
      consumerModel: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    originResolver = {
      validateConsumerAppScope: jest.fn((scope?: string | null) =>
        scope === `consumer` || scope === `consumer-mobile` || scope === `consumer-css-grid` ? scope : undefined,
      ),
      resolveConsumerOriginByScope: jest.fn((scope: string) => {
        if (scope === `consumer-mobile`) return `https://mobile.example`;
        if (scope === `consumer-css-grid`) return `https://grid.example`;
        return `https://consumer.example`;
      }),
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

  it(`rejects invalid tokens when no app scope can be resolved`, async () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error(`invalid`);
    });
    jwtService.decode.mockReturnValue(null);
    const res = { redirect: jest.fn() } as unknown as Response;

    await expect(service.signupVerification(`bad.jwt`, res)).rejects.toMatchObject({
      response: { message: errorCodes.ORIGIN_REQUIRED },
    });
    expect(res.redirect).not.toHaveBeenCalled();
    expect(prisma.consumerModel.findFirst).not.toHaveBeenCalled();
  });

  it(`keeps decoded app scope routing when verification fails`, async () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error(`expired`);
    });
    jwtService.decode.mockReturnValue({ appScope: `consumer-mobile` });
    const res = { redirect: jest.fn() } as unknown as Response;

    await service.signupVerification(`expired.jwt`, res);

    expect(res.redirect).toHaveBeenCalledWith(`https://mobile.example/signup/verification?verified=no`);
    expect(prisma.consumerModel.findFirst).not.toHaveBeenCalled();
  });

  it(`redirects without DB update when token is a session-bound access JWT`, async () => {
    jwtService.verify.mockReturnValue({
      sub: consumerId,
      identityId: consumerId,
      typ: `access`,
      scope: `consumer`,
      sid: `session-row-id`,
      appScope: `consumer`,
    });
    const res = { redirect: jest.fn() } as unknown as Response;

    await service.signupVerification(`tok`, res);

    expect(res.redirect).toHaveBeenCalledWith(`https://consumer.example/signup/verification?verified=no`);
    expect(prisma.consumerModel.findFirst).not.toHaveBeenCalled();
  });

  it(`redirects without DB update when scope is not consumer`, async () => {
    jwtService.verify.mockReturnValue({
      sub: consumerId,
      identityId: consumerId,
      typ: `access`,
      scope: `admin`,
      appScope: `consumer`,
    });
    const res = { redirect: jest.fn() } as unknown as Response;

    await service.signupVerification(`tok`, res);

    expect(res.redirect).toHaveBeenCalledWith(`https://consumer.example/signup/verification?verified=no`);
    expect(prisma.consumerModel.findFirst).not.toHaveBeenCalled();
  });

  it(`redirects without DB update when app scope is missing from the token`, async () => {
    jwtService.verify.mockReturnValue({
      sub: consumerId,
      identityId: consumerId,
      typ: `access`,
      scope: `consumer`,
    });
    const res = { redirect: jest.fn() } as unknown as Response;

    await expect(service.signupVerification(`tok`, res)).rejects.toMatchObject({
      response: { message: errorCodes.ORIGIN_REQUIRED },
    });
    expect(res.redirect).not.toHaveBeenCalled();
    expect(prisma.consumerModel.findFirst).not.toHaveBeenCalled();
  });

  it(`rejects invalid app scopes without DB update`, async () => {
    jwtService.verify.mockReturnValue({
      sub: consumerId,
      identityId: consumerId,
      typ: `access`,
      scope: `consumer`,
      appScope: `unknown-scope`,
    });
    const res = { redirect: jest.fn() } as unknown as Response;

    await expect(service.signupVerification(`tok`, res)).rejects.toMatchObject({
      response: { message: errorCodes.ORIGIN_REQUIRED },
    });
    expect(res.redirect).not.toHaveBeenCalled();
    expect(prisma.consumerModel.findFirst).not.toHaveBeenCalled();
  });

  it(`marks consumer verified and keeps email in success redirect for compatibility`, async () => {
    jwtService.verify.mockReturnValue({
      sub: consumerId,
      identityId: consumerId,
      typ: `access`,
      scope: `consumer`,
      appScope: `consumer-css-grid`,
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

    await service.signupVerification(`tok`, res);

    expect(prisma.consumerModel.update).toHaveBeenCalledWith({
      where: { id: consumerId },
      data: { verified: true },
    });
    const redirected = (res.redirect as jest.Mock).mock.calls[0][0] as string;
    expect(redirected).toContain(`/signup/verification`);
    expect(redirected).toContain(`https://grid.example/signup/verification`);
    // Link no longer carries `email`, but post-verify redirect intentionally may.
    expect(redirected).toContain(`email=`);
    expect(redirected).toContain(`verified=`);
  });
});
