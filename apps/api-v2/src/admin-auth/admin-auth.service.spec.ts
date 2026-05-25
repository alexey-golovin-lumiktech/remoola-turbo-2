import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';

import { oauthCrypto } from '@remoola/security-utils';
import { adminErrorCodes } from '@remoola/shared-constants';

import { ADMIN_AUTH_SESSION_REVOKE_REASONS } from './admin-auth-session-reasons';
import { AdminAuthSessionRepository } from './admin-auth-session.repository';
import { AdminAuthService } from './admin-auth.service';
import { AdminIdentityRepository } from './admin-identity.repository';
import { envs } from '../envs';
import { AuthAuditService, AUTH_AUDIT_EVENTS, AUTH_IDENTITY_TYPES } from '../shared/auth-audit.service';
import { PrismaTransactionRunner } from '../shared/prisma-transaction.runner';
import { PrismaService } from '../shared/prisma.service';
import { passwordUtils, secureCompare } from '../shared-common';

jest.mock(`@remoola/security-utils`, () => ({
  newUuid: jest.fn(() => `00000000-0000-4000-8000-000000000000`),
  oauthCrypto: {
    generateOAuthState: jest.fn(() => `generated-oauth-state`),
    hashOAuthState: jest.fn((token: string) => `hash-${token}`),
  },
}));

jest.mock(`../shared-common`, () => ({
  passwordUtils: {
    verifyPassword: jest.fn(),
  },
  secureCompare: jest.fn((a: string, b: string) => a === b),
}));

const mockVerifyPassword = passwordUtils.verifyPassword as jest.MockedFunction<typeof passwordUtils.verifyPassword>;
const mockSecureCompare = secureCompare as jest.MockedFunction<typeof secureCompare>;
const mockHashOAuthState = oauthCrypto.hashOAuthState as jest.MockedFunction<typeof oauthCrypto.hashOAuthState>;

describe(`AdminAuthService`, () => {
  let service: AdminAuthService;
  let prisma: {
    adminModel: { findFirst: jest.Mock };
    adminAuthSessionModel: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock; verify: jest.Mock };
  let authAudit: {
    checkLockoutAndRateLimit: jest.Mock;
    clearLockout: jest.Mock;
    recordAudit: jest.Mock;
    recordFailedAttempt: jest.Mock;
  };

  const adminIdentity = {
    id: `admin-1`,
    email: `admin@example.com`,
    password: `stored-hash`,
    salt: `stored-salt`,
    type: `super_admin`,
    deletedAt: null,
  };

  const activeSession = {
    id: `session-1`,
    adminId: adminIdentity.id,
    sessionFamilyId: `family-1`,
    refreshTokenHash: `hash-refresh-token`,
    accessTokenHash: `hash-access-token`,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    replacedById: null,
    lastUsedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();

    mockHashOAuthState.mockImplementation((token: string) => `hash-${token}`);
    mockSecureCompare.mockImplementation((a: string, b: string) => a === b);

    prisma = {
      adminModel: {
        findFirst: jest.fn(),
      },
      adminAuthSessionModel: {
        create: jest.fn().mockResolvedValue(undefined),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          adminAuthSessionModel: {
            create: jest.fn().mockResolvedValue(undefined),
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return fn(tx);
      }),
    };

    jwtService = {
      signAsync: jest.fn().mockImplementation(async (payload: { typ: string }, options?: { secret?: string }) => {
        if (payload.typ === `access`) return `access-token`;
        return options?.secret === envs.JWT_REFRESH_SECRET ? `refresh-token` : `legacy-token`;
      }),
      verify: jest.fn(),
    };

    authAudit = {
      checkLockoutAndRateLimit: jest.fn().mockResolvedValue(undefined),
      clearLockout: jest.fn().mockResolvedValue(undefined),
      recordAudit: jest.fn().mockResolvedValue(undefined),
      recordFailedAttempt: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthService,
        AdminIdentityRepository,
        AdminAuthSessionRepository,
        { provide: JwtService, useValue: jwtService },
        { provide: PrismaService, useValue: prisma },
        PrismaTransactionRunner,
        { provide: AuthAuditService, useValue: authAudit },
      ],
    }).compile();

    service = module.get(AdminAuthService);
  });

  describe(`login`, () => {
    const body = { email: `admin@example.com`, password: `secret-password` };
    const ctx = { ipAddress: `127.0.0.1`, userAgent: `jest` };

    it(`throws UnauthorizedException when admin is not found`, async () => {
      prisma.adminModel.findFirst.mockResolvedValue(null);

      await expect(service.login(body, ctx)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(body, ctx)).rejects.toMatchObject({
        response: expect.objectContaining({ message: adminErrorCodes.ADMIN_INVALID_CREDENTIALS }),
      });

      expect(mockVerifyPassword).not.toHaveBeenCalled();
      expect(prisma.adminAuthSessionModel.create).not.toHaveBeenCalled();
      expect(authAudit.recordAudit).not.toHaveBeenCalled();
    });

    it(`records login_failure and increments lockout when password is invalid`, async () => {
      prisma.adminModel.findFirst.mockResolvedValue(adminIdentity);
      mockVerifyPassword.mockResolvedValue(false);

      await expect(service.login(body, ctx)).rejects.toThrow(UnauthorizedException);
      expect(mockVerifyPassword).toHaveBeenCalledWith({
        password: body.password,
        storedHash: adminIdentity.password,
        storedSalt: adminIdentity.salt,
      });
      expect(authAudit.recordAudit).toHaveBeenCalledWith({
        identityType: AUTH_IDENTITY_TYPES.admin,
        identityId: adminIdentity.id,
        email: adminIdentity.email,
        event: AUTH_AUDIT_EVENTS.login_failure,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      expect(authAudit.recordFailedAttempt).toHaveBeenCalledWith(AUTH_IDENTITY_TYPES.admin, adminIdentity.email);
      expect(prisma.adminAuthSessionModel.create).not.toHaveBeenCalled();
    });

    it(`returns tokens and clears lockout when credentials are valid`, async () => {
      prisma.adminModel.findFirst.mockResolvedValue(adminIdentity);
      mockVerifyPassword.mockResolvedValue(true);

      const result = await service.login(body, ctx);
      const createdSessionId = prisma.adminAuthSessionModel.create.mock.calls[0][0].data.id as string;

      expect(result).toMatchObject({
        identity: adminIdentity,
        accessToken: `access-token`,
        refreshToken: `refresh-token`,
        sessionId: createdSessionId,
        sessionFamilyId: createdSessionId,
      });
      expect(authAudit.recordAudit).toHaveBeenCalledWith({
        identityType: AUTH_IDENTITY_TYPES.admin,
        identityId: adminIdentity.id,
        email: adminIdentity.email,
        event: AUTH_AUDIT_EVENTS.login_success,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      expect(authAudit.clearLockout).toHaveBeenCalledWith(AUTH_IDENTITY_TYPES.admin, adminIdentity.email);
      expect(prisma.adminAuthSessionModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: createdSessionId,
          adminId: adminIdentity.id,
          sessionFamilyId: createdSessionId,
          refreshTokenHash: `hash-refresh-token`,
          accessTokenHash: `hash-access-token`,
        }),
      });
    });
  });

  describe(`refreshAccess`, () => {
    it(`throws BadRequestException when refresh token is missing`, async () => {
      await expect(service.refreshAccess()).rejects.toThrow(BadRequestException);
      await expect(service.refreshAccess()).rejects.toMatchObject({
        response: expect.objectContaining({ message: adminErrorCodes.ADMIN_REFRESH_TOKEN_INVALID }),
      });
      expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it(`throws BadRequestException when refresh token verification fails`, async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error(`bad token`);
      });

      await expect(service.refreshAccess(`refresh-token`)).rejects.toThrow(BadRequestException);
      await expect(service.refreshAccess(`refresh-token`)).rejects.toMatchObject({
        response: expect.objectContaining({ message: adminErrorCodes.ADMIN_REFRESH_TOKEN_INVALID }),
      });
      expect(prisma.adminAuthSessionModel.findFirst).not.toHaveBeenCalled();
    });

    it(`rotates the session and returns a fresh token pair for a valid refresh token`, async () => {
      jwtService.verify.mockReturnValue({
        identityId: adminIdentity.id,
        sid: activeSession.id,
        typ: `refresh`,
      });
      prisma.adminAuthSessionModel.findFirst.mockResolvedValue(activeSession);
      prisma.adminModel.findFirst.mockResolvedValue(adminIdentity);

      const txCreate = jest.fn().mockResolvedValue(undefined);
      const txUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          adminAuthSessionModel: {
            create: txCreate,
            updateMany: txUpdateMany,
          },
        });
      });

      const result = await service.refreshAccess(`refresh-token`);
      const rotatedSessionId = txCreate.mock.calls[0][0].data.id as string;

      expect(result).toMatchObject({
        accessToken: `access-token`,
        refreshToken: `refresh-token`,
        type: adminIdentity.type,
        email: adminIdentity.email,
        id: adminIdentity.id,
        sessionId: rotatedSessionId,
        sessionFamilyId: activeSession.sessionFamilyId,
      });
      expect(txCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: rotatedSessionId,
          adminId: adminIdentity.id,
          sessionFamilyId: activeSession.sessionFamilyId,
          refreshTokenHash: `hash-refresh-token`,
          accessTokenHash: `hash-access-token`,
        }),
      });
      expect(txUpdateMany).toHaveBeenCalledWith({
        where: {
          id: activeSession.id,
          adminId: adminIdentity.id,
          refreshTokenHash: activeSession.refreshTokenHash,
          revokedAt: null,
          replacedById: null,
          expiresAt: { gte: expect.any(Date) },
        },
        data: expect.objectContaining({
          replacedById: rotatedSessionId,
          invalidatedReason: ADMIN_AUTH_SESSION_REVOKE_REASONS.rotated,
        }),
      });
      expect(authAudit.recordAudit).toHaveBeenCalledWith({
        identityType: AUTH_IDENTITY_TYPES.admin,
        identityId: adminIdentity.id,
        email: adminIdentity.email,
        event: AUTH_AUDIT_EVENTS.refresh_success,
      });
    });

    it(`treats a lost rotation compare-and-swap as refresh reuse`, async () => {
      jwtService.verify.mockReturnValue({
        identityId: adminIdentity.id,
        sid: activeSession.id,
        typ: `refresh`,
      });
      prisma.adminAuthSessionModel.findFirst.mockResolvedValue(activeSession);
      prisma.adminModel.findFirst.mockResolvedValue(adminIdentity);

      const txCreate = jest.fn().mockResolvedValue(undefined);
      const txUpdateMany = jest.fn().mockResolvedValue({ count: 0 });
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          adminAuthSessionModel: {
            create: txCreate,
            updateMany: txUpdateMany,
          },
        }),
      );

      await expect(service.refreshAccess(`refresh-token`)).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshAccess(`refresh-token`)).rejects.toMatchObject({
        response: expect.objectContaining({ message: adminErrorCodes.ADMIN_REFRESH_TOKEN_INVALID }),
      });

      expect(txUpdateMany).toHaveBeenCalledWith({
        where: {
          id: activeSession.id,
          adminId: adminIdentity.id,
          refreshTokenHash: activeSession.refreshTokenHash,
          revokedAt: null,
          replacedById: null,
          expiresAt: { gte: expect.any(Date) },
        },
        data: expect.objectContaining({
          invalidatedReason: ADMIN_AUTH_SESSION_REVOKE_REASONS.rotated,
        }),
      });
      expect(authAudit.recordAudit).toHaveBeenCalledWith({
        identityType: AUTH_IDENTITY_TYPES.admin,
        identityId: adminIdentity.id,
        email: adminIdentity.email,
        event: AUTH_AUDIT_EVENTS.refresh_reuse,
      });
      expect(authAudit.recordAudit).not.toHaveBeenCalledWith(
        expect.objectContaining({ event: AUTH_AUDIT_EVENTS.refresh_success }),
      );
      expect(prisma.adminAuthSessionModel.updateMany).toHaveBeenCalledWith({
        where: { sessionFamilyId: activeSession.sessionFamilyId, revokedAt: null },
        data: expect.objectContaining({
          invalidatedReason: ADMIN_AUTH_SESSION_REVOKE_REASONS.refresh_reuse_detected,
        }),
      });
    });

    it(`revokes the whole family and records refresh_reuse on mismatched rotated token reuse`, async () => {
      jwtService.verify.mockReturnValue({
        identityId: adminIdentity.id,
        sid: activeSession.id,
        typ: `refresh`,
      });
      prisma.adminAuthSessionModel.findFirst.mockResolvedValue({
        ...activeSession,
        refreshTokenHash: `hash-original-refresh-token`,
        replacedById: `session-rotated`,
      });
      prisma.adminModel.findFirst.mockResolvedValue(adminIdentity);
      mockSecureCompare.mockReturnValue(false);

      await expect(service.refreshAccess(`stolen-refresh-token`)).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshAccess(`stolen-refresh-token`)).rejects.toMatchObject({
        response: expect.objectContaining({ message: adminErrorCodes.ADMIN_REFRESH_TOKEN_INVALID }),
      });

      expect(prisma.adminAuthSessionModel.updateMany).toHaveBeenCalledWith({
        where: { sessionFamilyId: activeSession.sessionFamilyId, revokedAt: null },
        data: expect.objectContaining({
          invalidatedReason: ADMIN_AUTH_SESSION_REVOKE_REASONS.refresh_reuse_detected,
        }),
      });
      expect(authAudit.recordAudit).toHaveBeenCalledWith({
        identityType: AUTH_IDENTITY_TYPES.admin,
        identityId: adminIdentity.id,
        email: adminIdentity.email,
        event: AUTH_AUDIT_EVENTS.refresh_reuse,
      });
    });
  });

  describe(`verifyStepUp`, () => {
    it(`throws BadRequestException for an empty password confirmation`, async () => {
      await expect(service.verifyStepUp(adminIdentity.id, `   `)).rejects.toThrow(BadRequestException);
      await expect(service.verifyStepUp(adminIdentity.id, `   `)).rejects.toMatchObject({
        response: expect.objectContaining({
          message: adminErrorCodes.ADMIN_PASSWORD_CONFIRMATION_REQUIRED,
        }),
      });
    });

    it(`throws UnauthorizedException when admin is not found`, async () => {
      prisma.adminModel.findFirst.mockResolvedValue(null);

      await expect(service.verifyStepUp(adminIdentity.id, `secret-password`)).rejects.toThrow(UnauthorizedException);
      await expect(service.verifyStepUp(adminIdentity.id, `secret-password`)).rejects.toMatchObject({
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

      await expect(service.verifyStepUp(adminIdentity.id, `wrong-password`)).rejects.toThrow(UnauthorizedException);
      await expect(service.verifyStepUp(adminIdentity.id, `wrong-password`)).rejects.toMatchObject({
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

      await expect(service.verifyStepUp(adminIdentity.id, ` secret-password `)).resolves.toBeUndefined();
      expect(mockVerifyPassword).toHaveBeenCalledWith({
        password: `secret-password`,
        storedHash: adminIdentity.password,
        storedSalt: adminIdentity.salt,
      });
    });
  });
});
