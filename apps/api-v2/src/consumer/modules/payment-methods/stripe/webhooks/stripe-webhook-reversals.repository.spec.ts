import { Logger } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';
import { newUuid } from '@remoola/security-utils';

import { StripeWebhookReversalsRepository } from './stripe-webhook-reversals.repository';
import { createOutcomeIdempotent } from '../core/ledger-outcome-idempotent';

jest.mock(`../core/ledger-outcome-idempotent`, () => ({
  createOutcomeIdempotent: jest.fn().mockResolvedValue(undefined),
}));

describe(`StripeWebhookReversalsRepository`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe(`appendRefundUpdatedOutcome`, () => {
    it(`uses transition-scoped external ids for refund status updates`, async () => {
      const tx = {
        ledgerEntryModel: {
          findMany: jest.fn().mockResolvedValue([{ id: `entry-1` }]),
        },
      };
      const prisma = {
        $transaction: jest
          .fn()
          .mockImplementation(async (callback: (innerTx: typeof tx) => Promise<unknown>) => callback(tx)),
      } as any;
      const repository = new StripeWebhookReversalsRepository(prisma);

      await repository.appendRefundUpdatedOutcome({
        refundId: `re_1`,
        status: $Enums.TransactionStatus.PENDING,
        logger: new Logger(`test`),
      });

      expect(tx.ledgerEntryModel.findMany).toHaveBeenCalledWith({
        where: {
          stripeId: `re_1`,
          type: {
            in: [$Enums.LedgerEntryType.USER_PAYMENT_REVERSAL, $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL],
          },
        },
        select: { id: true },
      });
      expect(createOutcomeIdempotent).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          ledgerEntryId: `entry-1`,
          status: $Enums.TransactionStatus.PENDING,
          externalId: `refund-update:re_1:${$Enums.TransactionStatus.PENDING}`,
        }),
        expect.any(Logger),
      );
    });
  });

  describe(`createDisputeIfMissing`, () => {
    it(`creates a missing dispute row`, async () => {
      const tx = {
        $executeRaw: jest.fn().mockResolvedValue(undefined),
        ledgerEntryDisputeModel: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: `dispute-row` }),
        },
      };
      const prisma = {
        $transaction: jest
          .fn()
          .mockImplementation(async (callback: (innerTx: typeof tx) => Promise<unknown>) => callback(tx)),
      } as any;
      const repository = new StripeWebhookReversalsRepository(prisma);

      await repository.createDisputeIfMissing({
        ledgerEntryId: `ledger-1`,
        stripeDisputeId: `dp_1`,
        status: `needs_response`,
        amount: 1200,
        reason: `fraudulent`,
      });

      expect(tx.ledgerEntryDisputeModel.create).toHaveBeenCalledWith({
        data: {
          ledgerEntryId: `ledger-1`,
          stripeDisputeId: `dp_1`,
          metadata: expect.objectContaining({
            status: `needs_response`,
            amount: 1200,
            reason: `fraudulent`,
            updatedAt: expect.any(String),
          }),
        },
      });
    });

    it(`treats duplicate dispute inserts as idempotent`, async () => {
      const duplicateError = Object.assign(Object.create(Prisma.PrismaClientKnownRequestError.prototype), {
        code: `P2002`,
      });
      const tx = {
        $executeRaw: jest.fn().mockResolvedValue(undefined),
        ledgerEntryDisputeModel: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockRejectedValue(duplicateError),
        },
      };
      const prisma = {
        $transaction: jest
          .fn()
          .mockImplementation(async (callback: (innerTx: typeof tx) => Promise<unknown>) => callback(tx)),
      } as any;
      const repository = new StripeWebhookReversalsRepository(prisma);

      await expect(
        repository.createDisputeIfMissing({
          ledgerEntryId: `ledger-1`,
          stripeDisputeId: `dp_1`,
          status: `needs_response`,
          amount: 1200,
          reason: `fraudulent`,
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe(`appendStripeReversal`, () => {
    it(`creates requester deposit reversals and reversal outbox rows for deposit-backed refunds`, async () => {
      const tx = {
        $executeRaw: jest.fn().mockResolvedValue(undefined),
        ledgerEntryModel: {
          findMany: jest.fn().mockResolvedValue([]),
          findFirst: jest
            .fn()
            .mockResolvedValueOnce({ type: $Enums.LedgerEntryType.USER_DEPOSIT, ledgerId: `settlement-ledger-1` })
            .mockResolvedValueOnce({ ledgerId: `payer-ledger-1` }),
          create: jest.fn().mockResolvedValue(undefined),
        },
        notificationOutboxModel: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      };
      const prisma = {
        $transaction: jest
          .fn()
          .mockImplementation(async (callback: (innerTx: typeof tx) => Promise<unknown>) => callback(tx)),
      } as any;
      const repository = new StripeWebhookReversalsRepository(prisma);
      const logger = { debug: jest.fn() } as unknown as Logger;

      await repository.appendStripeReversal({
        paymentRequestId: `pr-1`,
        payerId: `payer-1`,
        requesterId: `requester-1`,
        requesterEmail: `requester@example.com`,
        requestAmount: 25,
        amount: 25,
        currencyCode: $Enums.CurrencyCode.USD,
        kind: `REFUND`,
        stripeObjectId: `re_1`,
        logger,
      });

      expect(tx.ledgerEntryModel.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            consumerId: `payer-1`,
            type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
            amount: 25,
            metadata: expect.objectContaining({
              reversalOfLedgerId: `payer-ledger-1`,
            }),
          }),
        }),
      );
      expect(tx.ledgerEntryModel.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            consumerId: `requester-1`,
            type: $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL,
            amount: -25,
            metadata: expect.objectContaining({
              reversalOfLedgerId: `settlement-ledger-1`,
            }),
          }),
        }),
      );
      expect(tx.notificationOutboxModel.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            eventType: `stripe.reversal.email_requested`,
            aggregateType: `ledger_reversal`,
            idempotencyKey: `stripe.reversal.email_requested:reversal:refund:re_1:payer:payer`,
          }),
          expect.objectContaining({
            eventType: `stripe.reversal.email_requested`,
            aggregateType: `ledger_reversal`,
            idempotencyKey: `stripe.reversal.email_requested:reversal:refund:re_1:payer:requester`,
          }),
        ]),
        skipDuplicates: true,
      });
      expect((logger.debug as jest.Mock).mock.calls).toEqual(
        expect.arrayContaining([
          [
            expect.objectContaining({
              paymentRequestId: `pr-1`,
              kind: `REFUND`,
              outboxQueued: true,
            }),
          ],
        ]),
      );
    });

    it(`runs requester balance assertion inside the repository-owned chargeback transaction`, async () => {
      const tx = {
        $executeRaw: jest.fn().mockResolvedValue(undefined),
        ledgerEntryModel: {
          findMany: jest.fn().mockResolvedValue([]),
          findFirst: jest
            .fn()
            .mockResolvedValueOnce({
              type: $Enums.LedgerEntryType.USER_DEPOSIT,
              ledgerId: `settlement-ledger-1`,
              paymentRequest: { paymentRail: $Enums.PaymentRail.CARD },
            })
            .mockResolvedValueOnce({ ledgerId: `payer-ledger-1` }),
          create: jest.fn().mockResolvedValue(undefined),
        },
        notificationOutboxModel: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      };
      const prisma = {
        $transaction: jest
          .fn()
          .mockImplementation(async (callback: (innerTx: typeof tx) => Promise<unknown>) => callback(tx)),
      } as any;
      const repository = new StripeWebhookReversalsRepository(prisma);
      const assertRequesterBalance = jest.fn().mockResolvedValue(undefined);

      await repository.appendStripeReversal({
        paymentRequestId: `pr-chargeback`,
        payerId: `payer-1`,
        requesterId: `requester-1`,
        requesterEmail: `requester@example.com`,
        requestAmount: 25,
        amount: 25,
        currencyCode: $Enums.CurrencyCode.USD,
        kind: `CHARGEBACK`,
        stripeObjectId: `dp_1`,
        logger: { debug: jest.fn() } as any,
        assertRequesterBalance,
      });

      expect(assertRequesterBalance).toHaveBeenCalledWith({
        tx,
        requesterId: `requester-1`,
        currencyCode: $Enums.CurrencyCode.USD,
        finalAmount: 25,
      });
      expect(tx.$executeRaw).toHaveBeenCalledTimes(3);
    });

    it(`caps external refunds to the remaining reversible amount`, async () => {
      const tx = {
        $executeRaw: jest.fn().mockResolvedValue(undefined),
        ledgerEntryModel: {
          findMany: jest.fn().mockResolvedValue([
            {
              amount: 20,
              status: $Enums.TransactionStatus.COMPLETED,
              outcomes: [],
            },
            {
              amount: 3,
              status: $Enums.TransactionStatus.DENIED,
              outcomes: [{ status: $Enums.TransactionStatus.PENDING }],
            },
            {
              amount: 99,
              status: $Enums.TransactionStatus.DENIED,
              outcomes: [],
            },
          ]),
          findFirst: jest
            .fn()
            .mockResolvedValueOnce({
              type: $Enums.LedgerEntryType.USER_DEPOSIT,
              ledgerId: `settlement-ledger-remaining`,
            })
            .mockResolvedValueOnce({ ledgerId: `payer-ledger-remaining` }),
          create: jest.fn().mockResolvedValue(undefined),
        },
        notificationOutboxModel: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      };
      const prisma = {
        $transaction: jest
          .fn()
          .mockImplementation(async (callback: (innerTx: typeof tx) => Promise<unknown>) => callback(tx)),
      } as any;
      const repository = new StripeWebhookReversalsRepository(prisma);

      await repository.appendStripeReversal({
        paymentRequestId: `pr-cap`,
        payerId: `payer-1`,
        requesterId: `requester-1`,
        requesterEmail: `requester@example.com`,
        requestAmount: 30,
        amount: 25,
        currencyCode: $Enums.CurrencyCode.USD,
        kind: `REFUND`,
        stripeObjectId: `re_cap`,
        logger: { debug: jest.fn() } as any,
      });

      expect(tx.ledgerEntryModel.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            consumerId: `payer-1`,
            amount: 7,
            idempotencyKey: `reversal:refund:re_cap:payer`,
          }),
        }),
      );
      expect(tx.ledgerEntryModel.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            consumerId: `requester-1`,
            amount: -7,
            idempotencyKey: `reversal:refund:re_cap:requester`,
          }),
        }),
      );
    });

    it(`skips fully reversed external events without appending entries`, async () => {
      const tx = {
        $executeRaw: jest.fn().mockResolvedValue(undefined),
        ledgerEntryModel: {
          findMany: jest.fn().mockResolvedValue([
            {
              amount: 30,
              status: $Enums.TransactionStatus.COMPLETED,
              outcomes: [],
            },
          ]),
          findFirst: jest.fn(),
          create: jest.fn().mockResolvedValue(undefined),
        },
        notificationOutboxModel: {
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
      };
      const prisma = {
        $transaction: jest
          .fn()
          .mockImplementation(async (callback: (innerTx: typeof tx) => Promise<unknown>) => callback(tx)),
      } as any;
      const repository = new StripeWebhookReversalsRepository(prisma);
      const logger = { debug: jest.fn() } as any;

      const appendedAmount = await repository.appendStripeReversal({
        paymentRequestId: `pr-fully-reversed`,
        payerId: `payer-1`,
        requesterId: `requester-1`,
        requesterEmail: `requester@example.com`,
        requestAmount: 30,
        amount: 10,
        currencyCode: $Enums.CurrencyCode.USD,
        kind: `REFUND`,
        stripeObjectId: `re_fully_reversed`,
        logger,
      });

      expect(appendedAmount).toBe(0);
      expect(tx.ledgerEntryModel.create).not.toHaveBeenCalled();
      expect(tx.notificationOutboxModel.createMany).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentRequestId: `pr-fully-reversed`,
          outboxQueued: false,
        }),
      );
    });
  });
});
