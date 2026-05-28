/* eslint-disable import/order */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';

import { hashTokenToHex } from '@remoola/security-utils';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerAuthService } from './auth.service';
import { consumerAuthServiceTestProviders } from './consumer-auth-testing.providers';
import { AdminNotificationMailingService } from '../../shared/admin-notification-mailing.service';
import { AuthAuditService } from '../../shared/auth-audit.service';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { PrismaService } from '../../shared/prisma.service';
import { RecoveryMailingService } from '../../shared/recovery-mailing.service';
import { SignupMailingService } from '../../shared/signup-mailing.service';

jest.mock(`@remoola/security-utils`, () => ({
  hashTokenToHex: jest.fn<(...a: any[]) => any>((t: string) => `hash-${t}`),
  oauthCrypto: {},
}));
jest.mock(`../../shared-common`, () => ({
  passwordUtils: {
    hashPassword: jest.fn<(...a: any[]) => any>().mockResolvedValue({ hash: `newHash`, salt: `newSalt` }),
  },
  secureCompare: jest.fn<(...a: any[]) => any>((a: string, b: string) => a === b),
  constants: { INVALID_EMAIL: `Invalid email` },
  IsValidEmail: () => () => {},
}));

import { secureCompare } from '../../shared-common';

const mockHashTokenToHex = hashTokenToHex as jest.MockedFunction<typeof hashTokenToHex>;
const mockSecureCompare = secureCompare as jest.MockedFunction<typeof secureCompare>;

describe(`ConsumerAuthService.resetPasswordWithToken`, () => {
  let service: ConsumerAuthService;
  let prisma: {
    resetPasswordModel: { findFirst: jest.Mock<(...a: any[]) => any>; updateMany: jest.Mock<(...a: any[]) => any> };
    consumerModel: { findFirst: jest.Mock<(...a: any[]) => any>; update: jest.Mock<(...a: any[]) => any> };
    authSessionModel: { count: jest.Mock<(...a: any[]) => any>; updateMany: jest.Mock<(...a: any[]) => any> };
    $transaction: jest.Mock<(...a: any[]) => any>;
  };
  let authAudit: { recordAudit: jest.Mock<(...a: any[]) => any> };

  const validRow = {
    id: `reset-row-id`,
    tokenHash: `hash-token`,
    expiredAt: new Date(Date.now() + 3600000),
    consumerId: `consumer-id`,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const validConsumer = {
    id: `consumer-id`,
    email: `user@example.com`,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockHashTokenToHex.mockImplementation((t: string) => `hash-${t}`);
    mockSecureCompare.mockImplementation((a: string, b: string) => a === b);

    prisma = {
      resetPasswordModel: {
        findFirst: jest.fn<(...a: any[]) => any>().mockResolvedValue(validRow),
        updateMany: jest.fn<(...a: any[]) => any>().mockResolvedValue({ count: 1 }),
      },
      consumerModel: {
        findFirst: jest.fn<(...a: any[]) => any>().mockResolvedValue(validConsumer),
        update: jest.fn<(...a: any[]) => any>().mockResolvedValue(validConsumer),
      },
      authSessionModel: {
        count: jest.fn<(...a: any[]) => any>().mockResolvedValue(2),
        updateMany: jest.fn<(...a: any[]) => any>().mockResolvedValue({ count: 2 }),
      },
      $transaction: jest
        .fn<(...a: any[]) => any>()
        .mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
          const tx = {
            resetPasswordModel: { updateMany: jest.fn<(...a: any[]) => any>().mockResolvedValue({ count: 1 }) },
            consumerModel: { update: jest.fn<(...a: any[]) => any>().mockResolvedValue(validConsumer) },
          };
          return fn(tx as never);
        }),
    };

    authAudit = {
      recordAudit: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: consumerAuthServiceTestProviders([
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn<(...a: any[]) => any>(),
            verify: jest.fn<(...a: any[]) => any>(),
            decode: jest.fn<(...a: any[]) => any>(),
          },
        },
        { provide: RecoveryMailingService, useValue: {} },
        { provide: AdminNotificationMailingService, useValue: {} },
        { provide: SignupMailingService, useValue: {} },
        { provide: AuthAuditService, useValue: authAudit },
        {
          provide: OriginResolverService,
          useValue: {
            getAllowedOrigins: jest.fn<(...a: any[]) => any>(),
          },
        },
      ]),
    }).compile();

    service = module.get(ConsumerAuthService);
  });

  it(`throws INVALID_CHANGE_PASSWORD_TOKEN when no reset row found`, async () => {
    prisma.resetPasswordModel.findFirst.mockResolvedValue(null);

    await expect(service.resetPasswordWithToken(`token`, `newPassword8`)).rejects.toThrow(BadRequestException);
    await expect(service.resetPasswordWithToken(`token`, `newPassword8`)).rejects.toMatchObject({
      response: { message: errorCodes.INVALID_CHANGE_PASSWORD_TOKEN },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it(`throws INVALID_CHANGE_PASSWORD_TOKEN when token hash does not match`, async () => {
    mockSecureCompare.mockReturnValue(false);

    await expect(service.resetPasswordWithToken(`token`, `newPassword8`)).rejects.toThrow(BadRequestException);
    await expect(service.resetPasswordWithToken(`token`, `newPassword8`)).rejects.toMatchObject({
      response: { message: errorCodes.INVALID_CHANGE_PASSWORD_TOKEN },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it(`throws INVALID_CHANGE_PASSWORD_TOKEN when consumer not found`, async () => {
    prisma.consumerModel.findFirst.mockResolvedValue(null);

    await expect(service.resetPasswordWithToken(`token`, `newPassword8`)).rejects.toThrow(BadRequestException);
    await expect(service.resetPasswordWithToken(`token`, `newPassword8`)).rejects.toMatchObject({
      response: { message: errorCodes.INVALID_CHANGE_PASSWORD_TOKEN },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it(`consumes token, updates password, revokes sessions and records audit on success`, async () => {
    await service.resetPasswordWithToken(`token`, `newPassword8`);

    expect(mockHashTokenToHex).toHaveBeenCalledWith(`token`);
    expect(prisma.resetPasswordModel.findFirst).toHaveBeenCalledWith({
      where: { tokenHash: `hash-token`, deletedAt: null, expiredAt: { gt: expect.any(Date) } },
    });
    expect(prisma.$transaction).toHaveBeenCalled();
    const txFn = prisma.$transaction.mock.calls[0][0];
    const tx = {
      resetPasswordModel: { updateMany: jest.fn<(...a: any[]) => any>().mockResolvedValue({ count: 1 }) },
      consumerModel: { update: jest.fn<(...a: any[]) => any>().mockResolvedValue(validConsumer) },
    };
    await txFn(tx as never);
    expect(tx.resetPasswordModel.updateMany).toHaveBeenCalledWith({
      where: { id: validRow.id, deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
    expect(tx.consumerModel.update).toHaveBeenCalledWith({
      where: { id: validConsumer.id },
      data: { password: `newHash`, salt: `newSalt` },
    });
    expect(prisma.authSessionModel.updateMany).toHaveBeenCalledWith({
      where: { consumerId: validConsumer.id, revokedAt: null },
      data: { revokedAt: expect.any(Date), invalidatedReason: `logout_all`, lastUsedAt: expect.any(Date) },
    });
    expect(authAudit.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        identityType: `consumer`,
        identityId: validConsumer.id,
        email: validConsumer.email,
        event: `password_change`,
      }),
    );
  });

  it(`throws INVALID_CHANGE_PASSWORD_TOKEN when token already consumed (updateMany affects 0 rows)`, async () => {
    type TxFn = (tx: {
      resetPasswordModel: { updateMany: jest.Mock<(...a: any[]) => any> };
      consumerModel: { update: jest.Mock<(...a: any[]) => any> };
    }) => Promise<unknown>;
    prisma.$transaction.mockImplementation(async (fn: TxFn) => {
      const tx = {
        resetPasswordModel: { updateMany: jest.fn<(...a: any[]) => any>().mockResolvedValue({ count: 0 }) },
        consumerModel: { update: jest.fn<(...a: any[]) => any>() },
      };
      return fn(tx);
    });

    await expect(service.resetPasswordWithToken(`token`, `newPassword8`)).rejects.toThrow(BadRequestException);
    await expect(service.resetPasswordWithToken(`token`, `newPassword8`)).rejects.toMatchObject({
      response: { message: errorCodes.INVALID_CHANGE_PASSWORD_TOKEN },
    });
  });
});
