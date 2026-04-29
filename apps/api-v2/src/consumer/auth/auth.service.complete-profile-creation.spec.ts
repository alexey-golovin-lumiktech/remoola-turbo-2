import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';

import { errorCodes } from '@remoola/shared-constants';

import { ConsumerAuthService } from './auth.service.spec-wrapper';
import { AuthAuditService } from '../../shared/auth-audit.service';
import { MailingService } from '../../shared/mailing.service';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { PrismaService } from '../../shared/prisma.service';

describe(`ConsumerAuthService.completeProfileCreationAndSendVerificationEmail`, () => {
  let service: ConsumerAuthService;
  let prisma: {
    consumerModel: { findFirst: jest.Mock };
  };
  let mailingService: { sendConsumerSignupVerificationEmail: jest.Mock };
  let jwtService: { signAsync: jest.Mock };

  const consumerId = `11111111-1111-1111-1111-111111111111`;

  beforeEach(async () => {
    prisma = {
      consumerModel: { findFirst: jest.fn() },
    };
    mailingService = { sendConsumerSignupVerificationEmail: jest.fn().mockResolvedValue(undefined) };
    jwtService = { signAsync: jest.fn().mockResolvedValue(`jwt-token`) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsumerAuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: MailingService, useValue: mailingService },
        { provide: AuthAuditService, useValue: { recordAudit: jest.fn() } },
        {
          provide: OriginResolverService,
          useValue: {
            validateConsumerAppScope: jest.fn((scope?: string | null) =>
              scope === `consumer-css-grid` ? scope : undefined,
            ),
          },
        },
      ],
    }).compile();

    service = module.get(ConsumerAuthService);
  });

  it(`sends signup verification email when consumer is not yet verified`, async () => {
    prisma.consumerModel.findFirst.mockResolvedValue({
      id: consumerId,
      email: `a@example.com`,
      verified: false,
    });

    await service.completeProfileCreationAndSendVerificationEmail(consumerId, `consumer-css-grid`);

    expect(jwtService.signAsync).toHaveBeenCalled();
    expect(mailingService.sendConsumerSignupVerificationEmail).toHaveBeenCalledWith({
      email: `a@example.com`,
      token: `jwt-token`,
    });
  });

  it(`does not send verification email when consumer is already verified (e.g. Google signup)`, async () => {
    prisma.consumerModel.findFirst.mockResolvedValue({
      id: consumerId,
      email: `a@example.com`,
      verified: true,
    });

    await service.completeProfileCreationAndSendVerificationEmail(consumerId, `consumer-css-grid`);

    expect(jwtService.signAsync).not.toHaveBeenCalled();
    expect(mailingService.sendConsumerSignupVerificationEmail).not.toHaveBeenCalled();
  });

  it(`throws when consumer is missing`, async () => {
    prisma.consumerModel.findFirst.mockResolvedValue(null);

    await expect(
      service.completeProfileCreationAndSendVerificationEmail(consumerId, `consumer-css-grid`),
    ).rejects.toMatchObject({
      response: { message: errorCodes.CONSUMER_NOT_FOUND_COMPLETE_PROFILE },
    });
  });
});
