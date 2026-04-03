/* eslint-disable import/order */
import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';

import { hashTokenToHex } from '@remoola/security-utils';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerAuthService } from './auth.service';
import { AuthAuditService } from '../../shared/auth-audit.service';
import { MailingService } from '../../shared/mailing.service';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { PrismaService } from '../../shared/prisma.service';

jest.mock(`@remoola/security-utils`, () => ({
  hashTokenToHex: jest.fn((t: string) => `hash-${t}`),
  oauthCrypto: {},
}));
jest.mock(`../../shared-common`, () => ({
  passwordUtils: {
    hashPassword: jest.fn().mockResolvedValue({ hash: `newHash`, salt: `newSalt` }),
  },
  secureCompare: jest.fn((a: string, b: string) => a === b),
  constants: { INVALID_EMAIL: `Invalid email` },
  IsValidEmail: () => () => {},
}));

import { secureCompare } from '../../shared-common';

const mockHashTokenToHex = hashTokenToHex as jest.MockedFunction<typeof hashTokenToHex>;
const mockSecureCompare = secureCompare as jest.MockedFunction<typeof secureCompare>;

describe(`ConsumerAuthService.resetPasswordWithToken`, () => {
  let service: ConsumerAuthService;
  let prisma: {
    resetPasswordModel: { findFirst: jest.Mock; updateMany: jest.Mock };
    consumerModel: { findFirst: jest.Mock; update: jest.Mock };
    authSessionModel: { count: jest.Mock };
    $transaction: jest.Mock;
  };
  let authAudit: { recordAudit: jest.Mock };

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
        findFirst: jest.fn().mockResolvedValue(validRow),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      consumerModel: {
        findFirst: jest.fn().mockResolvedValue(validConsumer),
        update: jest.fn().mockResolvedValue(validConsumer),
      },
      authSessionModel: {
        count: jest.fn().mockResolvedValue(2),
      },
      $transaction: jest.fn().mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        const tx = {
          resetPasswordModel: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
          consumerModel: { update: jest.fn().mockResolvedValue(validConsumer) },
        };
        return fn(tx as never);
      }),
    };

    authAudit = {
      recordAudit: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsumerAuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { signAsync: jest.fn(), verify: jest.fn(), decode: jest.fn() } },
        { provide: MailingService, useValue: { sendConsumerForgotPasswordEmail: jest.fn() } },
        { provide: AuthAuditService, useValue: authAudit },
        {
          provide: OriginResolverService,
          useValue: {
            validateRedirectOrigin: jest.fn(),
            resolveConsumerRedirectOrigin: jest.fn(),
            getAllowedOrigins: jest.fn(),
          },
        },
      ],
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
    const revokeSpy = jest.spyOn(service, `revokeAllSessionsByConsumerIdAndAudit`).mockResolvedValue(undefined);

    await service.resetPasswordWithToken(`token`, `newPassword8`);

    expect(mockHashTokenToHex).toHaveBeenCalledWith(`token`);
    expect(prisma.resetPasswordModel.findFirst).toHaveBeenCalledWith({
      where: { tokenHash: `hash-token`, deletedAt: null, expiredAt: { gt: expect.any(Date) } },
    });
    expect(prisma.$transaction).toHaveBeenCalled();
    const txFn = prisma.$transaction.mock.calls[0][0];
    const tx = {
      resetPasswordModel: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      consumerModel: { update: jest.fn().mockResolvedValue(validConsumer) },
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
    expect(revokeSpy).toHaveBeenCalledWith(validConsumer.id);
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
      resetPasswordModel: { updateMany: jest.Mock };
      consumerModel: { update: jest.Mock };
    }) => Promise<unknown>;
    prisma.$transaction.mockImplementation(async (fn: TxFn) => {
      const tx = {
        resetPasswordModel: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
        consumerModel: { update: jest.fn() },
      };
      return fn(tx);
    });

    await expect(service.resetPasswordWithToken(`token`, `newPassword8`)).rejects.toThrow(BadRequestException);
    await expect(service.resetPasswordWithToken(`token`, `newPassword8`)).rejects.toMatchObject({
      response: { message: errorCodes.INVALID_CHANGE_PASSWORD_TOKEN },
    });
  });
});
