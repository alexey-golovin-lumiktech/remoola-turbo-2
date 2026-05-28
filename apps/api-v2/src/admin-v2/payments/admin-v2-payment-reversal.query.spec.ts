import { describe, expect, it, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';

import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

import { AdminV2PaymentReversalQuery } from './admin-v2-payment-reversal.query';
import { PrismaService } from '../../shared/prisma.service';

describe(`AdminV2PaymentReversalQuery`, () => {
  function buildPrisma(overrides: {
    paymentRequestModel?: { findUnique: jest.Mock<(...a: any[]) => any> };
    ledgerEntryModel?: { findFirst?: jest.Mock<(...a: any[]) => any>; findMany?: jest.Mock<(...a: any[]) => any> };
    ledgerEntryOutcomeModel?: { findFirst: jest.Mock<(...a: any[]) => any> };
    consumerModel?: { findMany: jest.Mock<(...a: any[]) => any> };
  }) {
    return {
      paymentRequestModel: {
        findUnique: jest.fn<(...a: any[]) => any>(),
        ...overrides.paymentRequestModel,
      },
      ledgerEntryModel: {
        findFirst: jest.fn<(...a: any[]) => any>(),
        findMany: jest.fn<(...a: any[]) => any>(),
        ...overrides.ledgerEntryModel,
      },
      ledgerEntryOutcomeModel: {
        findFirst: jest.fn<(...a: any[]) => any>(),
        ...overrides.ledgerEntryOutcomeModel,
      },
      consumerModel: {
        findMany: jest.fn<(...a: any[]) => any>(),
        ...overrides.consumerModel,
      },
    };
  }

  it(`uses the completed stripe outcome externalId as the payment intent fallback`, async () => {
    const prisma = buildPrisma({
      ledgerEntryModel: {
        findFirst: jest.fn<(...a: any[]) => any>().mockResolvedValue(null),
      },
      ledgerEntryOutcomeModel: {
        findFirst: jest.fn<(...a: any[]) => any>().mockResolvedValue({ externalId: `pi_from_outcome` }),
      },
    });

    const query = new AdminV2PaymentReversalQuery(prisma as unknown as PrismaService);

    await expect(query.resolveStripePaymentIntentId(`pr-1`)).resolves.toBe(`pi_from_outcome`);
    expect(prisma.ledgerEntryModel.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          paymentRequestId: `pr-1`,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
        }),
      }),
    );
    expect(prisma.ledgerEntryOutcomeModel.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: $Enums.TransactionStatus.COMPLETED,
          source: `stripe`,
        }),
      }),
    );
  });

  it(`builds notification context with the stored consumer app scope`, async () => {
    const prisma = buildPrisma({
      ledgerEntryModel: {
        findMany: jest
          .fn<(...a: any[]) => any>()
          .mockResolvedValue([
            { id: `entry-1`, createdAt: new Date(), metadata: { consumerAppScope: CURRENT_CONSUMER_APP_SCOPE } },
          ]),
      },
      consumerModel: {
        findMany: jest.fn<(...a: any[]) => any>().mockResolvedValue([
          { id: `payer-1`, email: `payer@example.com` },
          { id: `requester-1`, email: `requester@example.com` },
        ]),
      },
    });

    const query = new AdminV2PaymentReversalQuery(prisma as unknown as PrismaService);

    await expect(
      query.getNotificationContext({
        paymentRequestId: `pr-1`,
        payerId: `payer-1`,
        requesterId: `requester-1`,
        requesterEmail: `fallback@example.com`,
      }),
    ).resolves.toEqual({
      consumerAppScope: CURRENT_CONSUMER_APP_SCOPE,
      payerEmail: `payer@example.com`,
      requesterEmailResolved: `requester@example.com`,
    });
  });

  it(`does not remap legacy payment-link metadata to the canonical consumer app scope`, async () => {
    const prisma = buildPrisma({
      ledgerEntryModel: {
        findMany: jest
          .fn<(...a: any[]) => any>()
          .mockResolvedValue([
            { id: `entry-1`, createdAt: new Date(), metadata: { consumerAppScope: `consumer-mobile` } },
          ]),
      },
      consumerModel: {
        findMany: jest.fn<(...a: any[]) => any>().mockResolvedValue([
          { id: `payer-1`, email: `payer@example.com` },
          { id: `requester-1`, email: `requester@example.com` },
        ]),
      },
    });

    const query = new AdminV2PaymentReversalQuery(prisma as unknown as PrismaService);

    await expect(
      query.getNotificationContext({
        paymentRequestId: `pr-1`,
        payerId: `payer-1`,
        requesterId: `requester-1`,
        requesterEmail: `fallback@example.com`,
      }),
    ).resolves.toEqual({
      consumerAppScope: undefined,
      payerEmail: `payer@example.com`,
      requesterEmailResolved: `requester@example.com`,
    });
  });

  it(`resolves from the Nest container with the PrismaService token`, async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminV2PaymentReversalQuery,
        {
          provide: PrismaService,
          useValue: buildPrisma({
            paymentRequestModel: { findUnique: jest.fn<(...a: any[]) => any>() },
            ledgerEntryOutcomeModel: { findFirst: jest.fn<(...a: any[]) => any>() },
            consumerModel: { findMany: jest.fn<(...a: any[]) => any>() },
          }),
        },
      ],
    }).compile();

    expect(moduleRef.get(AdminV2PaymentReversalQuery)).toBeInstanceOf(AdminV2PaymentReversalQuery);
  });
});
