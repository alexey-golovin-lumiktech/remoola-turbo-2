import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';

import { $Enums } from '@remoola/database-2';

import { ConsumerAuthService, type GoogleSignupPayload } from './auth.service';
import { AuthAuditService } from '../../shared/auth-audit.service';
import { MailingService } from '../../shared/mailing.service';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { PrismaService } from '../../shared/prisma.service';

describe(`ConsumerAuthService.signup (Google session)`, () => {
  const createsVerifiedGoogleConsumerTestName = [
    `creates a verified consumer and upserts Google profile metadata`,
    `when Google signup payload is present`,
  ].join(` `);

  let service: ConsumerAuthService;
  let prisma: {
    consumerModel: { findFirst: jest.Mock; create: jest.Mock };
    googleProfileDetailsModel: { upsert: jest.Mock };
  };

  const googlePayload = (email: string): GoogleSignupPayload => ({
    type: `google_signup`,
    email,
    emailVerified: true,
    name: null,
    givenName: `Ada`,
    familyName: `Lovelace`,
    picture: null,
    organization: null,
    sub: `google-sub`,
    signupEntryPath: `/signup/start`,
    nextPath: `/dashboard`,
    accountType: null,
    contractorKind: null,
    appScope: `consumer-css-grid`,
  });

  beforeEach(async () => {
    prisma = {
      consumerModel: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: `new-consumer-id`,
          email: `g@example.com`,
          verified: true,
          accountType: $Enums.AccountType.BUSINESS,
        }),
      },
      googleProfileDetailsModel: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsumerAuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: MailingService, useValue: { sendConsumerSignupVerificationEmail: jest.fn() } },
        { provide: AuthAuditService, useValue: { recordAudit: jest.fn() } },
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

  it(createsVerifiedGoogleConsumerTestName, async () => {
    const dto = {
      email: `g@example.com`,
      accountType: $Enums.AccountType.BUSINESS,
      howDidHearAboutUs: null,
      howDidHearAboutUsOther: null,
      addressDetails: { postalCode: `12345`, country: `US` },
      organizationDetails: {
        name: `Acme`,
        consumerRole: `owner`,
        size: $Enums.OrganizationSize.SMALL,
      },
    };

    const gp = googlePayload(`g@example.com`);
    const consumer = await service.signup(dto as any, gp);

    expect(consumer.verified).toBe(true);
    expect(prisma.consumerModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: `g@example.com`,
          verified: true,
        }),
      }),
    );
    const createData = prisma.consumerModel.create.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(createData).not.toHaveProperty(`password`);
    expect(createData).not.toHaveProperty(`salt`);
    expect(prisma.googleProfileDetailsModel.upsert).toHaveBeenCalled();
  });
});
