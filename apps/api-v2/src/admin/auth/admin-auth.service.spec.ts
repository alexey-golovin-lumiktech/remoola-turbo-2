import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';

import { oauthCrypto } from '@remoola/security-utils';
import { adminErrorCodes } from '@remoola/shared-constants';

import { AdminAuthService } from './admin-auth.service';
import { envs } from '../../envs';
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
    adminAuthSessionModel: { create: jest.Mock; findFirst: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
    resetPasswordModel: { updateMany: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock; verify: jest.Mock };
  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = {
      adminModel: { findFirst: jest.fn() },
      adminAuthSessionModel: {
        create: jest.fn().mockResolvedValue({ id: `session-id` }),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      resetPasswordModel: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({ id: `reset-id` }),
      },
      $transaction: jest.fn(async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma as never)),
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
      jwtService.signAsync.mockResolvedValueOnce(`access-token`).mockResolvedValueOnce(`refresh-token`);

      const result = await service.login(body);

      expect(result).toMatchObject({
        identity: { id: identity.id, email: identity.email },
        accessToken: `access-token`,
        refreshToken: `refresh-token`,
        sessionId: expect.any(String),
        sessionFamilyId: expect.any(String),
      });
      expect(result.sessionFamilyId).toBe(result.sessionId);
      expect(mockVerifyPassword).toHaveBeenCalledWith({
        password: body.password,
        storedHash: identity.password,
        storedSalt: identity.salt,
      });
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ sub: identity.id, identityId: identity.id, typ: `access`, scope: `admin` }),
        { expiresIn: envs.JWT_ACCESS_TTL_SECONDS },
      );
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          sub: identity.id,
          identityId: identity.id,
          sid: result.sessionId,
          fid: result.sessionFamilyId,
          typ: `refresh`,
          scope: `admin`,
        }),
        {
          expiresIn: envs.JWT_REFRESH_TTL_SECONDS,
          secret: envs.JWT_REFRESH_SECRET,
        },
      );
      expect(prisma.adminAuthSessionModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: result.sessionId,
          adminId: identity.id,
          sessionFamilyId: result.sessionFamilyId,
          refreshTokenHash: expect.any(String),
          accessTokenHash: expect.any(String),
          expiresAt: expect.any(Date),
          lastUsedAt: expect.any(Date),
        }),
      });
    });
  });

  describe(`refreshAccess`, () => {
    const refreshToken = `valid-refresh-token`;
    const sidPayload = { identityId: `admin-id`, sub: `admin-id`, sid: `session-1`, typ: `refresh` };
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

    it(`throws BadRequestException when refresh token is missing`, async () => {
      await expect(service.refreshAccess(undefined)).rejects.toThrow(BadRequestException);
      await expect(service.refreshAccess(undefined)).rejects.toMatchObject({
        response: expect.objectContaining({ message: adminErrorCodes.ADMIN_REFRESH_TOKEN_INVALID }),
      });
      expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it(`throws BadRequestException when refresh token is invalid (JWT verify fails)`, async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error(`invalid token`);
      });

      await expect(service.refreshAccess(refreshToken)).rejects.toThrow(BadRequestException);
      await expect(service.refreshAccess(refreshToken)).rejects.toMatchObject({
        response: expect.objectContaining({ message: adminErrorCodes.ADMIN_REFRESH_TOKEN_INVALID }),
      });
      expect(prisma.adminAuthSessionModel.findFirst).not.toHaveBeenCalled();
    });

    it(`throws BadRequestException when refresh token has no sid claim`, async () => {
      jwtService.verify.mockReturnValue({ identityId: `admin-id`, sub: `admin-id`, typ: `refresh` });

      await expect(service.refreshAccess(refreshToken)).rejects.toThrow(BadRequestException);
      await expect(service.refreshAccess(refreshToken)).rejects.toMatchObject({
        response: expect.objectContaining({ message: adminErrorCodes.ADMIN_REFRESH_TOKEN_INVALID }),
      });
      expect(prisma.adminAuthSessionModel.findFirst).not.toHaveBeenCalled();
    });

    it(`throws BadRequestException when refresh token has no identityId/sub`, async () => {
      jwtService.verify.mockReturnValue({ sid: `session-1`, typ: `refresh` });

      await expect(service.refreshAccess(refreshToken)).rejects.toThrow(BadRequestException);
      await expect(service.refreshAccess(refreshToken)).rejects.toMatchObject({
        response: expect.objectContaining({ message: adminErrorCodes.ADMIN_REFRESH_TOKEN_INVALID }),
      });
      expect(prisma.adminAuthSessionModel.findFirst).not.toHaveBeenCalled();
    });

    it(`throws BadRequestException when refresh token typ is not refresh`, async () => {
      jwtService.verify.mockReturnValue({ identityId: `admin-id`, sub: `admin-id`, sid: `session-1`, typ: `access` });

      await expect(service.refreshAccess(refreshToken)).rejects.toThrow(BadRequestException);
      await expect(service.refreshAccess(refreshToken)).rejects.toMatchObject({
        response: expect.objectContaining({ message: adminErrorCodes.ADMIN_REFRESH_TOKEN_INVALID }),
      });
      expect(prisma.adminAuthSessionModel.findFirst).not.toHaveBeenCalled();
    });

    it(`returns rotated session-based tokens when sid-bearing refresh is valid`, async () => {
      const refreshHash = oauthCrypto.hashOAuthState(refreshToken);
      jwtService.verify.mockReturnValue(sidPayload);
      prisma.adminAuthSessionModel.findFirst.mockResolvedValue({
        id: `session-1`,
        adminId: `admin-id`,
        sessionFamilyId: `family-1`,
        refreshTokenHash: refreshHash,
        accessTokenHash: `old-access-hash`,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        replacedById: null,
      });
      prisma.adminModel.findFirst.mockResolvedValue(admin);
      jwtService.signAsync.mockResolvedValueOnce(`new-access`).mockResolvedValueOnce(`new-refresh`);

      const result = await service.refreshAccess(refreshToken);

      expect(result).toMatchObject({
        accessToken: `new-access`,
        refreshToken: `new-refresh`,
        type: admin.type,
        email: admin.email,
        id: admin.id,
        sessionFamilyId: `family-1`,
      });
      expect(prisma.adminAuthSessionModel.findFirst).toHaveBeenCalledWith({
        where: { id: `session-1`, adminId: `admin-id` },
      });
      expect(prisma.adminAuthSessionModel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: `session-1` },
          data: expect.objectContaining({ invalidatedReason: `rotated` }),
        }),
      );
      expect(prisma.adminAuthSessionModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          adminId: admin.id,
          sessionFamilyId: `family-1`,
        }),
      });
      expect(jwtService.verify).toHaveBeenCalledWith(refreshToken, { secret: envs.JWT_REFRESH_SECRET });
    });

    it(`throws when sid-bearing refresh has no matching admin session`, async () => {
      jwtService.verify.mockReturnValue(sidPayload);
      prisma.adminAuthSessionModel.findFirst.mockResolvedValue(null);

      await expect(service.refreshAccess(refreshToken)).rejects.toThrow(BadRequestException);
      await expect(service.refreshAccess(refreshToken)).rejects.toMatchObject({
        response: expect.objectContaining({ message: adminErrorCodes.ADMIN_NO_IDENTITY_RECORD }),
      });
    });
  });

  describe(`revokeSessionByRefreshTokenAndAudit`, () => {
    const refreshToken = `valid-refresh-token`;

    it(`is a silent no-op when refresh token is missing`, async () => {
      await expect(service.revokeSessionByRefreshTokenAndAudit(undefined)).resolves.toBeUndefined();
      expect(jwtService.verify).not.toHaveBeenCalled();
      expect(prisma.adminAuthSessionModel.updateMany).not.toHaveBeenCalled();
    });

    it(`is a silent no-op when refresh token has no sid claim`, async () => {
      jwtService.verify.mockReturnValue({ identityId: `admin-id`, sub: `admin-id`, typ: `refresh` });
      prisma.adminModel.findFirst.mockResolvedValue(null);

      await expect(service.revokeSessionByRefreshTokenAndAudit(refreshToken)).resolves.toBeUndefined();
      expect(prisma.adminAuthSessionModel.updateMany).not.toHaveBeenCalled();
    });

    it(`is a silent no-op when JWT verification fails`, async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error(`invalid token`);
      });

      await expect(service.revokeSessionByRefreshTokenAndAudit(refreshToken)).resolves.toBeUndefined();
      expect(prisma.adminAuthSessionModel.updateMany).not.toHaveBeenCalled();
    });

    it(`revokes the matching admin session when refresh token carries a sid`, async () => {
      jwtService.verify.mockReturnValue({
        identityId: `admin-id`,
        sub: `admin-id`,
        sid: `session-1`,
        typ: `refresh`,
      });
      prisma.adminModel.findFirst.mockResolvedValue({ id: `admin-id`, email: `admin@example.com` });

      await service.revokeSessionByRefreshTokenAndAudit(refreshToken);

      expect(prisma.adminAuthSessionModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: `session-1`,
            adminId: `admin-id`,
            refreshTokenHash: oauthCrypto.hashOAuthState(refreshToken),
            revokedAt: null,
          }),
          data: expect.objectContaining({ invalidatedReason: `logout` }),
        }),
      );
    });
  });

  describe(`verifyStepUp`, () => {
    const adminId = `admin-id`;
    const admin = {
      id: adminId,
      password: `stored-hash`,
      salt: `stored-salt`,
    };

    it(`throws BadRequestException when passwordConfirmation is empty`, async () => {
      await expect(service.verifyStepUp(adminId, ``)).rejects.toThrow(BadRequestException);
      await expect(service.verifyStepUp(adminId, ``)).rejects.toMatchObject({
        response: expect.objectContaining({ message: adminErrorCodes.ADMIN_PASSWORD_CONFIRMATION_REQUIRED }),
      });
      expect(prisma.adminModel.findFirst).not.toHaveBeenCalled();
    });

    it(`throws BadRequestException when passwordConfirmation is only whitespace`, async () => {
      await expect(service.verifyStepUp(adminId, `   `)).rejects.toThrow(BadRequestException);
      await expect(service.verifyStepUp(adminId, `   `)).rejects.toMatchObject({
        response: expect.objectContaining({ message: adminErrorCodes.ADMIN_PASSWORD_CONFIRMATION_REQUIRED }),
      });
      expect(prisma.adminModel.findFirst).not.toHaveBeenCalled();
    });

    it(`throws UnauthorizedException when admin not found`, async () => {
      prisma.adminModel.findFirst.mockResolvedValue(null);

      await expect(service.verifyStepUp(adminId, `correct-password`)).rejects.toThrow(UnauthorizedException);
      await expect(service.verifyStepUp(adminId, `correct-password`)).rejects.toMatchObject({
        response: expect.objectContaining({ message: adminErrorCodes.ADMIN_PASSWORD_CONFIRMATION_INVALID }),
      });
      expect(prisma.adminModel.findFirst).toHaveBeenCalledWith({
        where: { id: adminId, deletedAt: null },
        select: { id: true, password: true, salt: true },
      });
    });

    it(`throws UnauthorizedException when password does not match`, async () => {
      prisma.adminModel.findFirst.mockResolvedValue(admin);
      mockVerifyPassword.mockResolvedValue(false);

      await expect(service.verifyStepUp(adminId, `wrong-password`)).rejects.toThrow(UnauthorizedException);
      await expect(service.verifyStepUp(adminId, `wrong-password`)).rejects.toMatchObject({
        response: expect.objectContaining({ message: adminErrorCodes.ADMIN_PASSWORD_CONFIRMATION_INVALID }),
      });
      expect(mockVerifyPassword).toHaveBeenCalledWith({
        password: `wrong-password`,
        storedHash: admin.password,
        storedSalt: admin.salt,
      });
    });

    it(`resolves when password matches`, async () => {
      prisma.adminModel.findFirst.mockResolvedValue(admin);
      mockVerifyPassword.mockResolvedValue(true);

      await expect(service.verifyStepUp(adminId, `correct-password`)).resolves.toBeUndefined();
      expect(mockVerifyPassword).toHaveBeenCalledWith({
        password: `correct-password`,
        storedHash: admin.password,
        storedSalt: admin.salt,
      });
    });
  });

  describe(`issueAdminPasswordReset`, () => {
    it(`creates an admin-scoped reset artifact`, async () => {
      prisma.adminModel.findFirst.mockResolvedValue({
        id: `admin-id`,
        email: `admin@example.com`,
      });

      const result = await service.issueAdminPasswordReset(`admin-id`);

      expect(result).toMatchObject({
        adminId: `admin-id`,
        emailDispatched: false,
        deliveryStatus: `verify_contract_missing`,
      });
      expect(prisma.resetPasswordModel.updateMany).toHaveBeenCalledWith({
        where: { adminId: `admin-id`, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
      expect(prisma.resetPasswordModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          adminId: `admin-id`,
          tokenHash: expect.any(String),
          expiredAt: expect.any(Date),
          appScope: `admin-v2`,
        }),
      });
    });

    it(`rejects unknown admins`, async () => {
      prisma.adminModel.findFirst.mockResolvedValue(null);

      await expect(service.issueAdminPasswordReset(`missing-admin`)).rejects.toThrow(BadRequestException);
      expect(prisma.resetPasswordModel.create).not.toHaveBeenCalled();
    });
  });
});
