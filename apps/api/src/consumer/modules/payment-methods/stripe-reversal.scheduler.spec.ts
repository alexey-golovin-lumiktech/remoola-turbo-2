import { $Enums } from '@remoola/database-2';

import { StripeReversalScheduler } from './stripe-reversal.scheduler';
import { type PrismaService } from '../../../shared/prisma.service';

const createOutcomeIdempotentMock = jest.fn().mockResolvedValue(undefined);

jest.mock(`./ledger-outcome-idempotent`, () => ({
  createOutcomeIdempotent: (...args: unknown[]) => createOutcomeIdempotentMock(...args),
}));

describe(`StripeReversalScheduler`, () => {
  let scheduler: StripeReversalScheduler;
  let prisma: {
    $transaction: jest.Mock;
  };
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let refundsRetrieveMock: jest.Mock;
  let lockAcquired: boolean;
  let pendingStripeIds: string[];
  let entriesByStripeId: Map<string, Array<{ id: string }>>;

  beforeEach(() => {
    lockAcquired = true;
    pendingStripeIds = [`re_1`, `re_1`];
    entriesByStripeId = new Map([[`re_1`, [{ id: `ledger-1` }, { id: `ledger-2` }]]]);
    refundsRetrieveMock = jest.fn().mockResolvedValue({ status: `succeeded` });
    prisma = {
      $transaction: jest.fn().mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([{ locked: lockAcquired }]),
          ledgerEntryModel: {
            findMany: jest
              .fn()
              .mockImplementation((args: { select?: { stripeId?: boolean }; where?: { stripeId?: string } }) => {
                if (args?.select?.stripeId) {
                  return Promise.resolve(pendingStripeIds.map((stripeId) => ({ stripeId })));
                }
                const stripeId = args?.where?.stripeId;
                if (!stripeId) return Promise.resolve([]);
                return Promise.resolve(entriesByStripeId.get(stripeId) ?? []);
              }),
          },
        };
        return cb(tx);
      }),
    };
    scheduler = new StripeReversalScheduler(prisma as unknown as PrismaService);
    (
      scheduler as unknown as {
        stripe: { refunds: { retrieve: (id: string) => Promise<{ status: string }> } };
      }
    ).stripe = { refunds: { retrieve: refundsRetrieveMock } };
    logSpy = jest
      .spyOn((scheduler as unknown as { logger: { log: (...args: unknown[]) => void } }).logger, `log`)
      .mockImplementation(() => undefined);
    warnSpy = jest
      .spyOn((scheduler as unknown as { logger: { warn: (...args: unknown[]) => void } }).logger, `warn`)
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    createOutcomeIdempotentMock.mockClear();
  });

  it(`emits run-level completion summary`, async () => {
    await expect(scheduler.reconcilePendingRefunds()).resolves.toBeUndefined();

    expect(refundsRetrieveMock).toHaveBeenCalledWith(`re_1`);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(createOutcomeIdempotentMock).toHaveBeenCalledTimes(2);
    expect(createOutcomeIdempotentMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: $Enums.TransactionStatus.COMPLETED,
        source: `stripe-reconcile`,
        externalId: `reconcile:re_1:${$Enums.TransactionStatus.COMPLETED}`,
      }),
      expect.anything(),
    );
    expect(logSpy).toHaveBeenCalledWith({
      event: `stripe_reversal_reconcile_complete`,
      pendingStripeIds: 1,
      processedStripeIds: 1,
      processed: 1,
      failed: 0,
    });
  });

  it(`keeps per-refund warn and increments failed count on item error`, async () => {
    refundsRetrieveMock.mockRejectedValue(new Error(`stripe failure`));
    await expect(scheduler.reconcilePendingRefunds()).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: `Failed to reconcile refund`,
        stripeId: `re_1`,
      }),
    );
    expect(logSpy).toHaveBeenCalledWith({
      event: `stripe_reversal_reconcile_complete`,
      pendingStripeIds: 1,
      processedStripeIds: 1,
      processed: 0,
      failed: 1,
    });
  });

  it(`bounds stripe ids processed per run`, async () => {
    pendingStripeIds = Array.from({ length: 80 }, (_, i) => `re_${i + 1}`);
    entriesByStripeId = new Map(pendingStripeIds.map((stripeId) => [stripeId, [{ id: `ledger-${stripeId}` }]]));

    await expect(scheduler.reconcilePendingRefunds()).resolves.toBeUndefined();

    expect(refundsRetrieveMock).toHaveBeenCalledTimes(50);
    expect(logSpy).toHaveBeenCalledWith({
      event: `stripe_reversal_reconcile_complete`,
      pendingStripeIds: 80,
      processedStripeIds: 50,
      processed: 50,
      failed: 0,
    });
  });

  it(`uses status-aware external ids so PENDING and COMPLETED transitions are both appendable`, async () => {
    refundsRetrieveMock.mockResolvedValueOnce({ status: `pending` }).mockResolvedValueOnce({ status: `succeeded` });

    await expect(scheduler.reconcilePendingRefunds()).resolves.toBeUndefined();
    await expect(scheduler.reconcilePendingRefunds()).resolves.toBeUndefined();

    expect(createOutcomeIdempotentMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: $Enums.TransactionStatus.PENDING,
        externalId: `reconcile:re_1:${$Enums.TransactionStatus.PENDING}`,
      }),
      expect.anything(),
    );
    expect(createOutcomeIdempotentMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: $Enums.TransactionStatus.COMPLETED,
        externalId: `reconcile:re_1:${$Enums.TransactionStatus.COMPLETED}`,
      }),
      expect.anything(),
    );
  });

  it(`maps canceled refunds to DENIED during reconcile`, async () => {
    refundsRetrieveMock.mockResolvedValue({ status: `canceled` });

    await expect(scheduler.reconcilePendingRefunds()).resolves.toBeUndefined();

    expect(createOutcomeIdempotentMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: $Enums.TransactionStatus.DENIED,
        externalId: `reconcile:re_1:${$Enums.TransactionStatus.DENIED}`,
      }),
      expect.anything(),
    );
  });

  it(`emits top-level failed event when pre-loop setup fails`, async () => {
    prisma.$transaction.mockImplementationOnce(async (cb: (tx: unknown) => Promise<void>) => {
      const tx = {
        $queryRaw: jest.fn().mockResolvedValue([{ locked: true }]),
        ledgerEntryModel: {
          findMany: jest.fn().mockImplementation((args: { select?: { stripeId?: boolean } }) => {
            if (args?.select?.stripeId) {
              return Promise.reject(new Error(`db down`));
            }
            return Promise.resolve([]);
          }),
        },
      };
      return cb(tx);
    });
    await expect(scheduler.reconcilePendingRefunds()).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: `stripe_reversal_reconcile_failed`,
      }),
    );
  });

  it(`skips run when advisory lock is not acquired`, async () => {
    lockAcquired = false;
    await expect(scheduler.reconcilePendingRefunds()).resolves.toBeUndefined();

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: `stripe_reversal_reconcile_skipped_lock_not_acquired`,
      }),
    );
    expect(refundsRetrieveMock).not.toHaveBeenCalled();
    expect(createOutcomeIdempotentMock).not.toHaveBeenCalled();
  });
});
