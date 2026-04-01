import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { errorCodes } from '@remoola/shared-constants';

import { ConsumerProfileService } from './consumer-profile.service';
import { UpdateConsumerProfileBody, UpdateConsumerProfilePersonalDetails } from './dtos/update-consumer-profile.dto';
import { AuthAuditService } from '../../../shared/auth-audit.service';
import { PrismaService } from '../../../shared/prisma.service';
import { passwordUtils } from '../../../shared-common';

jest.mock(`../../../shared-common`, () => ({
  buildConsumerVerificationState: jest.fn().mockReturnValue({
    status: `pending`,
    canStart: false,
    profileComplete: false,
    legalVerified: false,
    effectiveVerified: false,
    reviewStatus: `PENDING`,
    stripeStatus: `pending`,
    sessionId: null,
    lastErrorCode: null,
    lastErrorReason: null,
    startedAt: null,
    updatedAt: null,
    verifiedAt: null,
  }),
  passwordUtils: {
    verifyPassword: jest.fn(),
    hashPassword: jest.fn(),
  },
}));

const mockVerifyPassword = passwordUtils.verifyPassword as jest.MockedFunction<typeof passwordUtils.verifyPassword>;
const mockHashPassword = passwordUtils.hashPassword as jest.MockedFunction<typeof passwordUtils.hashPassword>;

describe(`ConsumerProfileService.changePassword`, () => {
  let service: ConsumerProfileService;
  let prisma: {
    consumerModel: { findUnique: jest.Mock; update: jest.Mock };
    personalDetailsModel: { findFirst: jest.Mock };
    addressDetailsModel: { findFirst: jest.Mock };
    organizationDetailsModel: { findFirst: jest.Mock };
    authSessionModel: { updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let authAudit: { recordAudit: jest.Mock };

  const consumer = {
    id: `consumer-id`,
    email: `consumer@example.com`,
    password: `stored-hash`,
    salt: `stored-salt`,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockVerifyPassword.mockResolvedValue(true);
    mockHashPassword.mockResolvedValue({ hash: `new-hash`, salt: `new-salt` });

    prisma = {
      consumerModel: {
        findUnique: jest.fn().mockResolvedValue(consumer),
        update: jest.fn().mockResolvedValue(undefined),
      },
      personalDetailsModel: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      addressDetailsModel: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      organizationDetailsModel: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      authSessionModel: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      $transaction: jest.fn().mockImplementation(async (queries: Promise<unknown>[]) => Promise.all(queries)),
    };

    authAudit = {
      recordAudit: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsumerProfileService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthAuditService, useValue: authAudit },
      ],
    }).compile();

    service = module.get(ConsumerProfileService);
  });

  it(`throws CURRENT_PASSWORD_INVALID when current password check fails`, async () => {
    mockVerifyPassword.mockResolvedValue(false);

    await expect(
      service.changePassword(`consumer-id`, { currentPassword: `wrong`, password: `newPassword1!` }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.changePassword(`consumer-id`, { currentPassword: `wrong`, password: `newPassword1!` }),
    ).rejects.toMatchObject({
      response: { message: errorCodes.CURRENT_PASSWORD_INVALID },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it(`allows first password set for Google accounts without current password`, async () => {
    prisma.consumerModel.findUnique.mockResolvedValueOnce({
      id: `consumer-id`,
      email: `consumer@example.com`,
      password: null,
      salt: null,
    });

    await service.changePassword(`consumer-id`, { password: `newPassword1!` });

    expect(mockVerifyPassword).not.toHaveBeenCalled();
    expect(mockHashPassword).toHaveBeenCalledWith(`newPassword1!`);
    expect(prisma.consumerModel.update).toHaveBeenCalledWith({
      where: { id: `consumer-id` },
      data: { password: `new-hash`, salt: `new-salt` },
    });
    expect(prisma.authSessionModel.updateMany).toHaveBeenCalledWith({
      where: { consumerId: `consumer-id`, revokedAt: null },
      data: { revokedAt: expect.any(Date), invalidatedReason: `logout_all`, lastUsedAt: expect.any(Date) },
    });
  });

  it(`still requires current password for accounts that already have one`, async () => {
    await expect(service.changePassword(`consumer-id`, { password: `newPassword1!` })).rejects.toMatchObject({
      response: { message: errorCodes.CURRENT_PASSWORD_INVALID },
    });
    expect(mockVerifyPassword).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it(`rejects password change when stored credentials are in a partial state`, async () => {
    prisma.consumerModel.findUnique.mockResolvedValueOnce({
      id: `consumer-id`,
      email: `consumer@example.com`,
      password: `stored-hash`,
      salt: null,
    });

    await expect(service.changePassword(`consumer-id`, { password: `newPassword1!` })).rejects.toMatchObject({
      response: { message: errorCodes.CURRENT_PASSWORD_INVALID },
    });
    expect(mockVerifyPassword).not.toHaveBeenCalled();
    expect(mockHashPassword).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(authAudit.recordAudit).not.toHaveBeenCalled();
  });

  it(`updates password, revokes sessions and records password_change + logout_all audit`, async () => {
    await service.changePassword(`consumer-id`, { currentPassword: `currentPass1!`, password: `newPassword1!` });

    expect(prisma.consumerModel.findUnique).toHaveBeenCalledWith({
      where: { id: `consumer-id` },
      select: { id: true, email: true, password: true, salt: true },
    });
    expect(mockVerifyPassword).toHaveBeenCalled();
    expect(mockHashPassword).toHaveBeenCalledWith(`newPassword1!`);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.consumerModel.update).toHaveBeenCalledWith({
      where: { id: `consumer-id` },
      data: { password: `new-hash`, salt: `new-salt` },
    });
    expect(prisma.authSessionModel.updateMany).toHaveBeenCalledWith({
      where: { consumerId: `consumer-id`, revokedAt: null },
      data: { revokedAt: expect.any(Date), invalidatedReason: `logout_all`, lastUsedAt: expect.any(Date) },
    });
    expect(authAudit.recordAudit).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        identityType: `consumer`,
        identityId: `consumer-id`,
        email: `consumer@example.com`,
        event: `password_change`,
      }),
    );
    expect(authAudit.recordAudit).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        identityType: `consumer`,
        identityId: `consumer-id`,
        email: `consumer@example.com`,
        event: `logout_all`,
      }),
    );
  });

  it(`sanitizes getProfile response and exposes hasPassword`, async () => {
    prisma.consumerModel.findUnique.mockResolvedValueOnce({
      id: `consumer-id`,
      email: `consumer@example.com`,
      password: `stored-hash`,
      salt: `stored-salt`,
      accountType: `CONTRACTOR`,
      personalDetails: null,
      addressDetails: null,
      organizationDetails: null,
      legalVerified: false,
      verificationStatus: null,
      stripeIdentityStatus: null,
      stripeIdentitySessionId: null,
      stripeIdentityLastErrorCode: null,
      stripeIdentityLastErrorReason: null,
      stripeIdentityStartedAt: null,
      stripeIdentityUpdatedAt: null,
      stripeIdentityVerifiedAt: null,
    });

    const result = await service.getProfile(`consumer-id`);

    expect(result).toMatchObject({
      id: `consumer-id`,
      email: `consumer@example.com`,
      hasPassword: true,
    });
    expect(result).toHaveProperty(`verification`);
    expect(result).not.toHaveProperty(`password`);
    expect(result).not.toHaveProperty(`salt`);
  });

  it(`sanitizes updateProfile response and exposes hasPassword`, async () => {
    prisma.consumerModel.update.mockResolvedValueOnce({
      id: `consumer-id`,
      email: `consumer@example.com`,
      password: null,
      salt: null,
      accountType: `CONTRACTOR`,
      personalDetails: null,
      addressDetails: null,
      organizationDetails: null,
    });

    const result = await service.updateProfile(`consumer-id`, {});

    expect(result).toMatchObject({
      id: `consumer-id`,
      email: `consumer@example.com`,
      hasPassword: false,
    });
    expect(result).not.toHaveProperty(`password`);
    expect(result).not.toHaveProperty(`salt`);
    expect(result).not.toHaveProperty(`verification`);
  });

  it(`persists explicitly cleared settings fields instead of keeping stale profile data`, async () => {
    prisma.personalDetailsModel.findFirst.mockResolvedValueOnce({
      firstName: `Alexey`,
      lastName: `Golovin`,
      citizenOf: `US`,
      passportOrIdNumber: `ABC123`,
      legalStatus: null,
      dateOfBirth: new Date(`1990-01-01T00:00:00.000Z`),
      countryOfTaxResidence: `US`,
      taxId: `123`,
      phoneNumber: `+12065550123`,
    });
    prisma.addressDetailsModel.findFirst.mockResolvedValueOnce({
      postalCode: `20500`,
      country: `United States`,
      city: `Washington`,
      street: `1600 Pennsylvania Avenue NW`,
      state: null,
    });
    prisma.organizationDetailsModel.findFirst.mockResolvedValueOnce({
      name: `DDD`,
      consumerRole: null,
      consumerRoleOther: null,
      size: `SMALL`,
    });
    prisma.consumerModel.update.mockResolvedValueOnce({
      id: `consumer-id`,
      email: `consumer@example.com`,
      password: null,
      salt: null,
      accountType: `CONTRACTOR`,
      personalDetails: { firstName: ``, lastName: `Golovin`, phoneNumber: `` },
      addressDetails: {
        country: `United States`,
        city: ``,
        street: `1600 Pennsylvania Avenue NW`,
        postalCode: `20500`,
      },
      organizationDetails: { name: ``, size: `SMALL`, consumerRole: null },
    });

    await service.updateProfile(`consumer-id`, {
      personalDetails: { firstName: ``, phoneNumber: `` },
      addressDetails: { city: `` },
      organizationDetails: { name: `` },
    });

    expect(prisma.consumerModel.update).toHaveBeenCalledWith({
      where: { id: `consumer-id` },
      data: {
        personalDetails: {
          upsert: {
            create: {
              firstName: ``,
              lastName: `Golovin`,
              citizenOf: `US`,
              passportOrIdNumber: `ABC123`,
              legalStatus: null,
              dateOfBirth: new Date(`1990-01-01T00:00:00.000Z`),
              countryOfTaxResidence: `US`,
              taxId: `123`,
              phoneNumber: ``,
            },
            update: {
              firstName: ``,
              lastName: `Golovin`,
              citizenOf: `US`,
              passportOrIdNumber: `ABC123`,
              legalStatus: null,
              dateOfBirth: new Date(`1990-01-01T00:00:00.000Z`),
              countryOfTaxResidence: `US`,
              taxId: `123`,
              phoneNumber: ``,
            },
          },
        },
        addressDetails: {
          upsert: {
            create: {
              postalCode: `20500`,
              country: `United States`,
              city: ``,
              street: `1600 Pennsylvania Avenue NW`,
              state: null,
            },
            update: {
              postalCode: `20500`,
              country: `United States`,
              city: ``,
              street: `1600 Pennsylvania Avenue NW`,
              state: null,
            },
          },
        },
        organizationDetails: {
          upsert: {
            create: {
              name: ``,
              consumerRole: null,
              consumerRoleOther: null,
              size: `SMALL`,
            },
            update: {
              name: ``,
              consumerRole: null,
              consumerRoleOther: null,
              size: `SMALL`,
            },
          },
        },
      },
      include: {
        personalDetails: true,
        addressDetails: true,
        organizationDetails: true,
      },
    });
  });

  it(`preserves omitted sibling DTO fields when Nest transforms partial profile payloads`, async () => {
    prisma.personalDetailsModel.findFirst.mockResolvedValueOnce({
      firstName: `Alexey`,
      lastName: `Golovin`,
      citizenOf: `US`,
      passportOrIdNumber: `ABC123`,
      legalStatus: null,
      dateOfBirth: new Date(`1990-01-01T00:00:00.000Z`),
      countryOfTaxResidence: `US`,
      taxId: `123`,
      phoneNumber: `+12065550123`,
    });
    prisma.consumerModel.update.mockResolvedValueOnce({
      id: `consumer-id`,
      email: `consumer@example.com`,
      password: null,
      salt: null,
      accountType: `CONTRACTOR`,
      personalDetails: { firstName: ``, lastName: `Golovin`, phoneNumber: `+12065550123` },
      addressDetails: null,
      organizationDetails: null,
    });

    const body = new UpdateConsumerProfileBody();
    body.personalDetails = new UpdateConsumerProfilePersonalDetails();
    body.personalDetails.firstName = ``;

    await service.updateProfile(`consumer-id`, body);

    expect(prisma.consumerModel.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          personalDetails: {
            upsert: {
              create: expect.objectContaining({
                firstName: ``,
                lastName: `Golovin`,
                phoneNumber: `+12065550123`,
              }),
              update: expect.objectContaining({
                firstName: ``,
                lastName: `Golovin`,
                phoneNumber: `+12065550123`,
              }),
            },
          },
        }),
      }),
    );
  });
});
