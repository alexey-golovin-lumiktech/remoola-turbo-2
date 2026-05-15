import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';

import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerAuthService } from './auth.service.spec-wrapper';
import { AuthAuditService } from '../../shared/auth-audit.service';
import { MailingService } from '../../shared/mailing.service';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { PrismaService } from '../../shared/prisma.service';

describe(`ConsumerAuthService.resendSignupVerificationEmail`, () => {
  let service: ConsumerAuthService;
  let prisma: {
    consumerModel: { findFirst: jest.Mock };
  };
  let mailingService: { sendConsumerSignupVerificationEmailSafe: jest.Mock };
  let jwtService: { signAsync: jest.Mock };

  const consumerId = `11111111-1111-1111-1111-111111111111`;

  beforeEach(async () => {
    prisma = {
      consumerModel: { findFirst: jest.fn() },
    };
    mailingService = { sendConsumerSignupVerificationEmailSafe: jest.fn().mockResolvedValue(true) };
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
              scope === CURRENT_CONSUMER_APP_SCOPE ? scope : undefined,
            ),
          },
        },
      ],
    }).compile();

    service = module.get(ConsumerAuthService);
  });

  it(`sends signup verification email when consumer is active and not yet verified`, async () => {
    prisma.consumerModel.findFirst.mockResolvedValue({
      id: consumerId,
      email: `a@example.com`,
      verified: false,
    });

    await expect(service.resendSignupVerificationEmail(consumerId, CURRENT_CONSUMER_APP_SCOPE)).resolves.toBe(true);

    expect(jwtService.signAsync).toHaveBeenCalled();
    expect(mailingService.sendConsumerSignupVerificationEmailSafe).toHaveBeenCalledWith({
      email: `a@example.com`,
      token: `jwt-token`,
    });
  });

  it(`throws when consumer is missing`, async () => {
    prisma.consumerModel.findFirst.mockResolvedValue(null);

    await expect(service.resendSignupVerificationEmail(consumerId, CURRENT_CONSUMER_APP_SCOPE)).rejects.toMatchObject({
      response: { message: errorCodes.CONSUMER_NOT_FOUND_COMPLETE_PROFILE },
    });
  });

  it(`throws when consumer is already verified`, async () => {
    prisma.consumerModel.findFirst.mockResolvedValue({
      id: consumerId,
      email: `a@example.com`,
      verified: true,
    });

    await expect(service.resendSignupVerificationEmail(consumerId, CURRENT_CONSUMER_APP_SCOPE)).rejects.toMatchObject({
      response: {
        message: `Signup verification email is not applicable for an already verified consumer`,
      },
    });
  });
});
