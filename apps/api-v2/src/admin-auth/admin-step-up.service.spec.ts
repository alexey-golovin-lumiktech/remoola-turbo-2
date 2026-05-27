import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { adminErrorCodes } from '@remoola/shared-constants';

import { AdminIdentityRepository } from './admin-identity.repository';
import { AdminStepUpService } from './admin-step-up.service';
import { PrismaService } from '../shared/prisma.service';
import { passwordUtils } from '../shared-common';

jest.mock(`../shared-common`, () => ({
  passwordUtils: {
    verifyPassword: jest.fn(),
  },
}));

const mockVerifyPassword = passwordUtils.verifyPassword as jest.MockedFunction<typeof passwordUtils.verifyPassword>;

describe(`AdminStepUpService`, () => {
  let service: AdminStepUpService;
  let prisma: { adminModel: { findFirst: jest.Mock } };

  const adminIdentity = {
    id: `admin-1`,
    password: `stored-hash`,
    salt: `stored-salt`,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prisma = {
      adminModel: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminStepUpService, AdminIdentityRepository, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(AdminStepUpService);
  });

  it(`throws BadRequestException for an empty password confirmation`, async () => {
    await expect(service.verify(adminIdentity.id, `   `)).rejects.toThrow(BadRequestException);
    await expect(service.verify(adminIdentity.id, `   `)).rejects.toMatchObject({
      response: expect.objectContaining({
        message: adminErrorCodes.ADMIN_PASSWORD_CONFIRMATION_REQUIRED,
      }),
    });
  });

  it(`throws UnauthorizedException when admin is not found`, async () => {
    prisma.adminModel.findFirst.mockResolvedValue(null);

    await expect(service.verify(adminIdentity.id, `secret-password`)).rejects.toThrow(UnauthorizedException);
    await expect(service.verify(adminIdentity.id, `secret-password`)).rejects.toMatchObject({
      response: expect.objectContaining({
        message: adminErrorCodes.ADMIN_PASSWORD_CONFIRMATION_INVALID,
      }),
    });
    expect(mockVerifyPassword).not.toHaveBeenCalled();
  });

  it(`throws UnauthorizedException when password confirmation is invalid`, async () => {
    prisma.adminModel.findFirst.mockResolvedValue({
      id: adminIdentity.id,
      password: adminIdentity.password,
      salt: adminIdentity.salt,
    });
    mockVerifyPassword.mockResolvedValue(false);

    await expect(service.verify(adminIdentity.id, `wrong-password`)).rejects.toThrow(UnauthorizedException);
    await expect(service.verify(adminIdentity.id, `wrong-password`)).rejects.toMatchObject({
      response: expect.objectContaining({
        message: adminErrorCodes.ADMIN_PASSWORD_CONFIRMATION_INVALID,
      }),
    });
  });

  it(`resolves when password confirmation is valid`, async () => {
    prisma.adminModel.findFirst.mockResolvedValue({
      id: adminIdentity.id,
      password: adminIdentity.password,
      salt: adminIdentity.salt,
    });
    mockVerifyPassword.mockResolvedValue(true);

    await expect(service.verify(adminIdentity.id, ` secret-password `)).resolves.toBeUndefined();
    expect(mockVerifyPassword).toHaveBeenCalledWith({
      password: `secret-password`,
      storedHash: adminIdentity.password,
      storedSalt: adminIdentity.salt,
    });
  });
});
