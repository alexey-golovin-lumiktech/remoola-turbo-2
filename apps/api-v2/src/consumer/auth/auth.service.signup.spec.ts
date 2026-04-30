import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';

jest.mock(`@remoola/security-utils`, () => ({
  hashTokenToHex: jest.fn((token: string) => `hash-${token}`),
  oauthCrypto: {},
}));

jest.mock(`../../shared-common`, () => ({
  passwordUtils: {
    hashPassword: jest.fn().mockResolvedValue({ hash: `hashed-password`, salt: `generated-salt` }),
  },
  secureCompare: jest.fn((a: string, b: string) => a === b),
  constants: { INVALID_EMAIL: `Invalid email` },
  IsValidEmail: () => () => {},
}));

import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

import { type GoogleSignupPayload } from './auth.service';
import { ConsumerAuthService } from './auth.service.spec-wrapper';
import { AuthAuditService } from '../../shared/auth-audit.service';
import { MailingService } from '../../shared/mailing.service';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { PrismaService } from '../../shared/prisma.service';
import { passwordUtils } from '../../shared-common';

const mockHashPassword = passwordUtils.hashPassword as jest.MockedFunction<typeof passwordUtils.hashPassword>;

type SignupCase = {
  name: string;
  dto: Record<string, unknown>;
  expectedPersonalDetails: Record<string, unknown>;
  expectedOrganizationDetails?: Record<string, unknown>;
  expectedContractorKind: $Enums.ContractorKind | null;
};

describe(`ConsumerAuthService.signup`, () => {
  let service: ConsumerAuthService;
  let prisma: {
    consumerModel: { findFirst: jest.Mock; create: jest.Mock };
    googleProfileDetailsModel: { upsert: jest.Mock };
  };
  const entitySignupDateOfBirthPlaceholder = new Date(0);
  const entitySignupPassportPlaceholder = `ENTITY_SIGNUP_NOT_APPLICABLE`;

  const signupCases: SignupCase[] = [
    {
      name: `BUSINESS`,
      dto: {
        email: `business@example.com`,
        password: `Password123!`,
        accountType: $Enums.AccountType.BUSINESS,
        howDidHearAboutUs: null,
        howDidHearAboutUsOther: null,
        addressDetails: {
          postalCode: `12345`,
          country: `US`,
          city: `New York`,
          state: `NY`,
          street: `15 Central Park W`,
        },
        organizationDetails: {
          name: `Acme LLC`,
          consumerRole: $Enums.ConsumerRole.FOUNDER,
          size: $Enums.OrganizationSize.SMALL,
        },
        personalDetails: {
          countryOfTaxResidence: `United States`,
          taxId: `98-7654321`,
          phoneNumber: `+12125550123`,
        },
      },
      expectedPersonalDetails: {
        legalStatus: null,
        citizenOf: `United States`,
        dateOfBirth: entitySignupDateOfBirthPlaceholder,
        passportOrIdNumber: entitySignupPassportPlaceholder,
        countryOfTaxResidence: `United States`,
        taxId: `98-7654321`,
        phoneNumber: `+12125550123`,
        firstName: null,
        lastName: null,
      },
      expectedOrganizationDetails: {
        name: `Acme LLC`,
        consumerRole: $Enums.ConsumerRole.FOUNDER,
        size: $Enums.OrganizationSize.SMALL,
      },
      expectedContractorKind: null,
    },
    {
      name: `CONTRACTOR + ENTITY`,
      dto: {
        email: `entity@example.com`,
        password: `Password123!`,
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.ENTITY,
        howDidHearAboutUs: null,
        howDidHearAboutUsOther: null,
        addressDetails: {
          postalCode: `12345`,
          country: `US`,
          city: `New York`,
          state: `NY`,
          street: `15 Central Park W`,
        },
        organizationDetails: {
          name: `Entity Co`,
          consumerRole: $Enums.ConsumerRole.FOUNDER,
          size: $Enums.OrganizationSize.SMALL,
        },
        personalDetails: {
          countryOfTaxResidence: `United States`,
          taxId: `98-7654321`,
          phoneNumber: `+12125550123`,
        },
      },
      expectedPersonalDetails: {
        legalStatus: null,
        citizenOf: `United States`,
        dateOfBirth: entitySignupDateOfBirthPlaceholder,
        passportOrIdNumber: entitySignupPassportPlaceholder,
        countryOfTaxResidence: `United States`,
        taxId: `98-7654321`,
        phoneNumber: `+12125550123`,
        firstName: null,
        lastName: null,
      },
      expectedOrganizationDetails: {
        name: `Entity Co`,
        consumerRole: $Enums.ConsumerRole.FOUNDER,
        size: $Enums.OrganizationSize.SMALL,
      },
      expectedContractorKind: $Enums.ContractorKind.ENTITY,
    },
    {
      name: `CONTRACTOR + INDIVIDUAL`,
      dto: {
        email: `individual@example.com`,
        password: `Password123!`,
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.INDIVIDUAL,
        howDidHearAboutUs: null,
        howDidHearAboutUsOther: null,
        addressDetails: {
          postalCode: `12345`,
          country: `US`,
          city: `New York`,
          state: `NY`,
          street: `15 Central Park W`,
        },
        personalDetails: {
          firstName: `Jane`,
          lastName: `Doe`,
          citizenOf: `United States`,
          dateOfBirth: `1990-10-01`,
          legalStatus: $Enums.LegalStatus.INDIVIDUAL,
          countryOfTaxResidence: `United States`,
          taxId: `123456789`,
          passportOrIdNumber: `A1234567`,
          phoneNumber: `+12125550123`,
        },
      },
      expectedPersonalDetails: {
        legalStatus: $Enums.LegalStatus.INDIVIDUAL,
        citizenOf: `United States`,
        dateOfBirth: new Date(`1990-10-01`),
        passportOrIdNumber: `A1234567`,
        countryOfTaxResidence: `United States`,
        taxId: `123456789`,
        phoneNumber: `+12125550123`,
        firstName: `Jane`,
        lastName: `Doe`,
      },
      expectedContractorKind: $Enums.ContractorKind.INDIVIDUAL,
    },
  ];

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
    appScope: CURRENT_CONSUMER_APP_SCOPE,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    prisma = {
      consumerModel: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
          id: `new-consumer-id`,
          email: data.email,
          verified: data.verified,
          accountType: data.accountType,
          contractorKind: data.contractorKind,
        })),
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

  it.each(signupCases)(
    `persists $name branch for password signup`,
    async ({ dto, expectedContractorKind, expectedOrganizationDetails, expectedPersonalDetails }) => {
      const consumer = await service.signup(dto as any);

      expect(consumer.verified).toBe(false);
      expect(mockHashPassword).toHaveBeenCalledWith(`Password123!`);
      expect(prisma.googleProfileDetailsModel.upsert).not.toHaveBeenCalled();

      const createData = prisma.consumerModel.create.mock.calls[0]?.[0]?.data as Record<string, unknown>;
      expect(createData).toEqual(
        expect.objectContaining({
          email: dto.email,
          verified: false,
          legalVerified: false,
          contractorKind: expectedContractorKind,
          password: `hashed-password`,
          salt: `generated-salt`,
          personalDetails: { create: expectedPersonalDetails },
        }),
      );

      if (expectedOrganizationDetails) {
        expect(createData).toEqual(
          expect.objectContaining({
            organizationDetails: { create: expectedOrganizationDetails },
          }),
        );
      } else {
        expect(createData).not.toHaveProperty(`organizationDetails`);
      }
    },
  );

  it.each(signupCases)(
    `persists $name branch for Google signup without password hash`,
    async ({ dto, expectedContractorKind, expectedOrganizationDetails, expectedPersonalDetails }) => {
      const consumer = await service.signup(dto as any, googlePayload(dto.email as string));

      expect(consumer.verified).toBe(true);
      expect(mockHashPassword).not.toHaveBeenCalled();
      expect(prisma.googleProfileDetailsModel.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { consumerId: `new-consumer-id` },
        }),
      );

      const createData = prisma.consumerModel.create.mock.calls[0]?.[0]?.data as Record<string, unknown>;
      expect(createData).toEqual(
        expect.objectContaining({
          email: dto.email,
          verified: true,
          legalVerified: false,
          contractorKind: expectedContractorKind,
          personalDetails: { create: expectedPersonalDetails },
        }),
      );
      expect(createData).not.toHaveProperty(`password`);
      expect(createData).not.toHaveProperty(`salt`);

      if (expectedOrganizationDetails) {
        expect(createData).toEqual(
          expect.objectContaining({
            organizationDetails: { create: expectedOrganizationDetails },
          }),
        );
      } else {
        expect(createData).not.toHaveProperty(`organizationDetails`);
      }
    },
  );

  it(`keeps individual contractor signup strict for core personal identity fields`, async () => {
    await expect(
      service.signup({
        email: `individual@example.com`,
        password: `Password123!`,
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.INDIVIDUAL,
        howDidHearAboutUs: null,
        howDidHearAboutUsOther: null,
        addressDetails: {
          postalCode: `12345`,
          country: `US`,
        },
        personalDetails: {
          citizenOf: `United States`,
          dateOfBirth: `1990-10-01`,
          passportOrIdNumber: ``,
          taxId: `123456789`,
          phoneNumber: `+12125550123`,
        },
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it(`rejects whitespace-only passwords even when raw length is at least eight characters`, async () => {
    await expect(
      service.signup({
        email: `business@example.com`,
        password: `        `,
        accountType: $Enums.AccountType.BUSINESS,
        howDidHearAboutUs: null,
        howDidHearAboutUsOther: null,
        addressDetails: {
          postalCode: `12345`,
          country: `US`,
        },
        organizationDetails: {
          name: `Acme LLC`,
          consumerRole: $Enums.ConsumerRole.FOUNDER,
          size: $Enums.OrganizationSize.SMALL,
        },
        personalDetails: {
          countryOfTaxResidence: `United States`,
          taxId: `98-7654321`,
          phoneNumber: `+12125550123`,
        },
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockHashPassword).not.toHaveBeenCalled();
  });
});
