import { Logger } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { StripePaymentOutcomesRepository } from './stripe-payment-outcomes.repository';
import { type StripePaymentRequestAccessRepository } from './stripe-payment-request-access.repository';
import { type PrismaService } from '../../../../../shared/prisma.service';

describe(`StripePaymentOutcomesRepository`, () => {
  function makeRepository(overrides?: {
    ledgerEntries?: Array<{
      id: string;
      status?: $Enums.TransactionStatus;
      outcomes?: Array<{ status: $Enums.TransactionStatus }>;
    }>;
  }) {
    const entries = overrides?.ledgerEntries ?? [{ id: `le-1` }];
    const ledgerEntryModel = {
      findMany: jest.fn(async () => entries),
    };
    const ledgerEntryOutcomeModel = {
      create: jest.fn(async (_args: unknown) => ({})),
    };
    const prisma = {
      ledgerEntryModel,
      ledgerEntryOutcomeModel,
      $transaction: jest.fn(async <T>(fn: (tx: unknown) => Promise<T>) =>
        fn({ ledgerEntryModel, ledgerEntryOutcomeModel }),
      ),
    };
    const paymentRequestAccessRepository = {
      markPaymentRequestCompletedForStripe: jest.fn(async () => undefined),
    };
    return {
      prisma,
      ledgerEntryOutcomeModel,
      ledgerEntryModel,
      paymentRequestAccessRepository,
      repository: new StripePaymentOutcomesRepository(
        prisma as unknown as PrismaService,
        paymentRequestAccessRepository as unknown as StripePaymentRequestAccessRepository,
      ),
    };
  }

  const logger = new Logger(`test`);

  describe(`appendCheckoutWaitingOutcomes`, () => {
    it(`creates a WAITING outcome for each ledger entry tagged with the checkout session`, async () => {
      const ctx = makeRepository({ ledgerEntries: [{ id: `le-a` }, { id: `le-b` }] });
      await ctx.repository.appendCheckoutWaitingOutcomes({
        paymentRequestId: `pr-1`,
        checkoutSessionId: `cs-99`,
        logger,
      });

      expect(ctx.ledgerEntryModel.findMany).toHaveBeenCalledWith({
        where: { paymentRequestId: `pr-1` },
        select: { id: true },
      });
      expect(ctx.ledgerEntryOutcomeModel.create).toHaveBeenCalledTimes(2);
      const args = ctx.ledgerEntryOutcomeModel.create.mock.calls[0]?.[0] as {
        data: {
          ledgerEntry: { connect: { id: string } };
          status: $Enums.TransactionStatus;
          source: string;
          externalId: string;
        };
      };
      expect(args.data.ledgerEntry.connect.id).toBe(`le-a`);
      expect(args.data.status).toBe($Enums.TransactionStatus.WAITING);
      expect(args.data.source).toBe(`stripe`);
      expect(args.data.externalId).toBe(`cs-99`);
    });
  });

  describe(`markSavedMethodPaymentCompleted`, () => {
    it(`runs in a transaction, skips already-completed entries, marks the request completed`, async () => {
      const ctx = makeRepository({
        ledgerEntries: [
          {
            id: `le-a`,
            status: $Enums.TransactionStatus.PENDING,
            outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
          },
          { id: `le-b`, status: $Enums.TransactionStatus.PENDING, outcomes: [] },
        ],
      });
      await ctx.repository.markSavedMethodPaymentCompleted({
        paymentRequestId: `pr-1`,
        paymentIntentId: `pi-7`,
        logger,
      });

      expect(ctx.prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(ctx.ledgerEntryOutcomeModel.create).toHaveBeenCalledTimes(1);
      const args = ctx.ledgerEntryOutcomeModel.create.mock.calls[0]?.[0] as {
        data: { ledgerEntry: { connect: { id: string } }; status: $Enums.TransactionStatus; externalId: string };
      };
      expect(args.data.ledgerEntry.connect.id).toBe(`le-b`);
      expect(args.data.status).toBe($Enums.TransactionStatus.COMPLETED);
      expect(args.data.externalId).toBe(`pi-7`);
      expect(ctx.paymentRequestAccessRepository.markPaymentRequestCompletedForStripe).toHaveBeenCalledWith(
        expect.anything(),
        `pr-1`,
      );
    });

    it(`falls back to entry.status when no outcomes are recorded yet`, async () => {
      const ctx = makeRepository({
        ledgerEntries: [
          { id: `le-a`, status: $Enums.TransactionStatus.COMPLETED, outcomes: [] },
          { id: `le-b`, status: $Enums.TransactionStatus.PENDING, outcomes: [] },
        ],
      });
      await ctx.repository.markSavedMethodPaymentCompleted({
        paymentRequestId: `pr-1`,
        paymentIntentId: `pi-7`,
        logger,
      });

      expect(ctx.ledgerEntryOutcomeModel.create).toHaveBeenCalledTimes(1);
      const args = ctx.ledgerEntryOutcomeModel.create.mock.calls[0]?.[0] as {
        data: { ledgerEntry: { connect: { id: string } } };
      };
      expect(args.data.ledgerEntry.connect.id).toBe(`le-b`);
    });
  });

  describe(`appendDeniedSavedMethodPaymentOutcomes`, () => {
    it(`creates a DENIED outcome with a synthesized externalId per entry, in a transaction`, async () => {
      const ctx = makeRepository({ ledgerEntries: [{ id: `le-a` }, { id: `le-b` }] });
      await ctx.repository.appendDeniedSavedMethodPaymentOutcomes({
        paymentRequestId: `pr-1`,
        logger,
      });

      expect(ctx.prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(ctx.ledgerEntryOutcomeModel.create).toHaveBeenCalledTimes(2);
      const a = ctx.ledgerEntryOutcomeModel.create.mock.calls[0]?.[0] as {
        data: { status: $Enums.TransactionStatus; externalId: string; source: string };
      };
      const b = ctx.ledgerEntryOutcomeModel.create.mock.calls[1]?.[0] as {
        data: { status: $Enums.TransactionStatus; externalId: string };
      };
      expect(a.data.status).toBe($Enums.TransactionStatus.DENIED);
      expect(a.data.source).toBe(`stripe`);
      expect(a.data.externalId).toBe(`denied:stripe:pr:pr-1:entry:le-a`);
      expect(b.data.externalId).toBe(`denied:stripe:pr:pr-1:entry:le-b`);
    });
  });
});
