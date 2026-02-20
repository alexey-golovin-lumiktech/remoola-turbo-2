import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';

import { adminErrorCodes } from '@remoola/shared-constants';

import { AdminAuthService } from './admin-auth.service';
import { AuthAuditService } from '../../shared/auth-audit.service';
import { PrismaService } from '../../shared/prisma.service';
import { passwordUtils } from '../../shared-common';

jest.mock(`../../shared-common`, () => ({
  passwordUtils: {
    verifyPassword: jest.fn(),
  },
  secureCompare: jest.fn((a: string, b: string) => a === b),
}));

const mockVerifyPassword = passwordUtils.verifyPassword as jest.MockedFunction<typeof passwordUtils.verifyPassword>;

describe(`AdminAuthService`, () => {
  let service: AdminAuthService;
  let prisma: {
    adminModel: { findFirst: jest.Mock };
    accessRefreshTokenModel: { findFirst: jest.Mock; create: jest.Mock; upsert: jest.Mock };
  };
  let jwtService: { signAsync: jest.Mock; verify: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = {
      adminModel: { findFirst: jest.fn() },
      accessRefreshTokenModel: {
        findFirst: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue(`mock-token`),
      verify: jest.fn(),
    };

    const authAudit = {
      checkLockoutAndRateLimit: jest.fn().mockResolvedValue(undefined),
      recordAudit: jest.fn().mockResolvedValue(undefined),
      recordFailedAttempt: jest.fn().mockResolvedValue(undefined),
      clearLockout: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: AuthAuditService, useValue: authAudit },
      ],
    }).compile();

    service = module.get(AdminAuthService);
  });

  describe(`login`, () => {
    const body = { email: `admin@example.com`, password: `secret` };
    const identity = {
      id: `admin-id`,
      email: `admin@example.com`,
      password: `hash`,
      salt: `salt`,
      type: `ADMIN`,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    it(`throws UnauthorizedException when admin not found`, async () => {
      prisma.adminModel.findFirst.mockResolvedValue(null);

      await expect(service.login(body)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(body)).rejects.toMatchObject({
        response: expect.objectContaining({ message: adminErrorCodes.ADMIN_INVALID_CREDENTIALS }),
      });
      expect(mockVerifyPassword).not.toHaveBeenCalled();
    });

    it(`throws UnauthorizedException when password is invalid`, async () => {
      prisma.adminModel.findFirst.mockResolvedValue(identity);
      mockVerifyPassword.mockResolvedValue(false);

      await expect(service.login(body)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(body)).rejects.toMatchObject({
        response: expect.objectContaining({ message: adminErrorCodes.ADMIN_INVALID_CREDENTIALS }),
      });
      expect(mockVerifyPassword).toHaveBeenCalledWith({
        password: body.password,
        storedHash: identity.password,
        storedSalt: identity.salt,
      });
    });

    it(`returns identity and tokens when credentials are valid`, async () => {
      prisma.adminModel.findFirst.mockResolvedValue(identity);
      mockVerifyPassword.mockResolvedValue(true);
      prisma.accessRefreshTokenModel.findFirst.mockResolvedValue(null);
      prisma.accessRefreshTokenModel.create.mockImplementation((args: { data: unknown }) =>
        Promise.resolve({
          accessToken: (args as { data: { accessToken: string } }).data.accessToken,
          refreshToken: (args as { data: { refreshToken: string } }).data.refreshToken,
        }),
      );
      jwtService.signAsync.mockResolvedValueOnce(`access-token`).mockResolvedValueOnce(`refresh-token`);

      const result = await service.login(body);

      expect(result).toMatchObject({
        identity: { id: identity.id, email: identity.email },
        accessToken: `access-token`,
        refreshToken: `refresh-token`,
      });
      expect(mockVerifyPassword).toHaveBeenCalledWith({
        password: body.password,
        storedHash: identity.password,
        storedSalt: identity.salt,
      });
    });
  });

  describe(`refreshAccess`, () => {
    const refreshToken = `valid-refresh-token`;
    const payload = { identityId: `admin-id` };
    const admin = {
      id: `admin-id`,
      email: `admin@example.com`,
      type: `ADMIN`,
      password: `h`,
      salt: `s`,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    it(`throws BadRequestException when refresh token is invalid (JWT verify fails)`, async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error(`invalid token`);
      });

      await expect(service.refreshAccess(refreshToken)).rejects.toThrow(BadRequestException);
      await expect(service.refreshAccess(refreshToken)).rejects.toMatchObject({
        response: expect.objectContaining({ message: adminErrorCodes.ADMIN_REFRESH_TOKEN_INVALID }),
      });
      expect(prisma.accessRefreshTokenModel.findFirst).not.toHaveBeenCalled();
    });

    it(`throws BadRequestException when no token record exists`, async () => {
      jwtService.verify.mockReturnValue(payload);
      prisma.accessRefreshTokenModel.findFirst.mockResolvedValue(null);

      await expect(service.refreshAccess(refreshToken)).rejects.toThrow(BadRequestException);
      await expect(service.refreshAccess(refreshToken)).rejects.toMatchObject({
        response: expect.objectContaining({ message: adminErrorCodes.ADMIN_NO_IDENTITY_RECORD }),
      });
    });

    it(`throws BadRequestException when stored refresh token does not match`, async () => {
      jwtService.verify.mockReturnValue(payload);
      prisma.accessRefreshTokenModel.findFirst.mockResolvedValue({
        id: `token-id`,
        refreshToken: `other-token`,
        identityId: payload.identityId,
      });
      prisma.adminModel.findFirst.mockResolvedValue(admin);

      await expect(service.refreshAccess(refreshToken)).rejects.toThrow(BadRequestException);
      await expect(service.refreshAccess(refreshToken)).rejects.toMatchObject({
        response: expect.objectContaining({ message: adminErrorCodes.ADMIN_REFRESH_TOKEN_INVALID }),
      });
    });

    it(`returns access data when token is valid`, async () => {
      jwtService.verify.mockReturnValue(payload);
      prisma.accessRefreshTokenModel.findFirst
        .mockResolvedValueOnce({ id: `token-id`, refreshToken, identityId: payload.identityId })
        .mockResolvedValueOnce({ id: `token-id` });
      prisma.adminModel.findFirst.mockResolvedValue(admin);
      prisma.accessRefreshTokenModel.upsert.mockImplementation((args: { update: unknown }) =>
        Promise.resolve({
          accessToken: (args as { update: { accessToken: string } }).update.accessToken,
          refreshToken: (args as { update: { refreshToken: string } }).update.refreshToken,
        }),
      );
      jwtService.signAsync.mockResolvedValueOnce(`new-access`).mockResolvedValueOnce(`new-refresh`);

      const result = await service.refreshAccess(refreshToken);

      expect(result).toMatchObject({
        accessToken: `new-access`,
        refreshToken: `new-refresh`,
        type: admin.type,
        email: admin.email,
        id: admin.id,
      });
    });
  });
});
