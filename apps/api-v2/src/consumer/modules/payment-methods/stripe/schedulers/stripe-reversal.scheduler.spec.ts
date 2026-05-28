import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { $Enums } from '@remoola/database-2';

import { StripeReversalSchedulerRepository } from './stripe-reversal-scheduler.repository';
import { StripeReversalScheduler } from './stripe-reversal.scheduler';

type ReversalSchedulerSelection =
  | { skipped: true }
  | { skipped: false; stripeIdsForRun: string[]; pendingStripeIds: number };

const createOutcomeIdempotentMock = jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined);

jest.mock(`../core/ledger-outcome-idempotent`, () => ({
  createOutcomeIdempotent: (...args: unknown[]) => createOutcomeIdempotentMock(...args),
}));

describe(`StripeReversalScheduler`, () => {
  let scheduler: StripeReversalScheduler;
  let reversalSchedulerRepository: jest.Mocked<StripeReversalSchedulerRepository>;
  let logSpy: jest.SpiedFunction<(...a: any[]) => any>;
  let warnSpy: jest.SpiedFunction<(...a: any[]) => any>;
  let refundsRetrieveMock: jest.Mock<(...a: any[]) => any>;
  let selection: ReversalSchedulerSelection;

  beforeEach(() => {
    selection = { skipped: false, stripeIdsForRun: [`re_1`], pendingStripeIds: 1 };
    refundsRetrieveMock = jest.fn<(...a: any[]) => any>().mockResolvedValue({ status: `succeeded` });
    reversalSchedulerRepository = {
      recordRefundOutcome: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
      selectPendingStripeIdsForRun: jest.fn<(...a: any[]) => any>().mockImplementation(async () => selection),
    } as unknown as jest.Mocked<StripeReversalSchedulerRepository>;
    scheduler = new StripeReversalScheduler(reversalSchedulerRepository, {
      refunds: { retrieve: refundsRetrieveMock },
    } as any);
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
    expect(reversalSchedulerRepository.recordRefundOutcome).toHaveBeenCalledWith({
      stripeId: `re_1`,
      status: $Enums.TransactionStatus.COMPLETED,
      externalId: `reconcile:re_1:${$Enums.TransactionStatus.COMPLETED}`,
      logger: expect.anything(),
    });
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

  it(`bounds stripe ids processed per run from repository selection`, async () => {
    const stripeIdsForRun = Array.from({ length: 50 }, (_, i) => `re_${i + 1}`);
    selection = { skipped: false, stripeIdsForRun, pendingStripeIds: 80 };

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

    expect(reversalSchedulerRepository.recordRefundOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        status: $Enums.TransactionStatus.PENDING,
        externalId: `reconcile:re_1:${$Enums.TransactionStatus.PENDING}`,
      }),
    );
    expect(reversalSchedulerRepository.recordRefundOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        status: $Enums.TransactionStatus.COMPLETED,
        externalId: `reconcile:re_1:${$Enums.TransactionStatus.COMPLETED}`,
      }),
    );
  });

  it(`maps canceled refunds to DENIED during reconcile`, async () => {
    refundsRetrieveMock.mockResolvedValue({ status: `canceled` });

    await expect(scheduler.reconcilePendingRefunds()).resolves.toBeUndefined();

    expect(reversalSchedulerRepository.recordRefundOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        status: $Enums.TransactionStatus.DENIED,
        externalId: `reconcile:re_1:${$Enums.TransactionStatus.DENIED}`,
      }),
    );
  });

  it(`emits top-level failed event when pre-loop setup fails`, async () => {
    reversalSchedulerRepository.selectPendingStripeIdsForRun.mockRejectedValueOnce(new Error(`db down`));

    await expect(scheduler.reconcilePendingRefunds()).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: `stripe_reversal_reconcile_failed`,
      }),
    );
  });

  it(`skips run when advisory lock is not acquired`, async () => {
    selection = { skipped: true };

    await expect(scheduler.reconcilePendingRefunds()).resolves.toBeUndefined();

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: `stripe_reversal_reconcile_skipped_lock_not_acquired`,
      }),
    );
    expect(refundsRetrieveMock).not.toHaveBeenCalled();
    expect(reversalSchedulerRepository.recordRefundOutcome).not.toHaveBeenCalled();
  });
});

describe(`StripeReversalSchedulerRepository`, () => {
  afterEach(() => {
    createOutcomeIdempotentMock.mockClear();
  });

  function createRepository(params?: {
    lockAcquired?: boolean;
    pendingEntries?: Array<{
      stripeId: string | null;
      status: $Enums.TransactionStatus;
      outcomes: Array<{ status: $Enums.TransactionStatus }>;
    }>;
    entriesByStripeId?: Map<string, Array<{ id: string }>>;
  }) {
    const entriesByStripeId = params?.entriesByStripeId ?? new Map<string, Array<{ id: string }>>();
    const ledgerEntryFindMany = jest
      .fn<(...a: any[]) => any>()
      .mockImplementation((args: { select?: { stripeId?: boolean }; where?: { stripeId?: string } }) => {
        if (args?.select?.stripeId) {
          return Promise.resolve(params?.pendingEntries ?? []);
        }
        const stripeId = args?.where?.stripeId;
        if (!stripeId) return Promise.resolve([]);
        return Promise.resolve(entriesByStripeId.get(stripeId) ?? []);
      });
    const tx = {
      $queryRaw: jest.fn<(...a: any[]) => any>().mockResolvedValue([{ locked: params?.lockAcquired ?? true }]),
      ledgerEntryModel: {
        findMany: ledgerEntryFindMany,
      },
    };
    const prisma = {
      $transaction: jest
        .fn<(...a: any[]) => any>()
        .mockImplementation(async (cb: (innerTx: typeof tx) => Promise<unknown>) => cb(tx)),
    } as any;

    return {
      repository: new StripeReversalSchedulerRepository(prisma),
      tx,
      ledgerEntryFindMany,
      prisma,
    };
  }

  function makePendingEntry(params: {
    stripeId?: string | null;
    status?: $Enums.TransactionStatus;
    outcomeStatus?: $Enums.TransactionStatus;
  }) {
    return {
      stripeId: params.stripeId ?? `re_1`,
      status: params.status ?? $Enums.TransactionStatus.PENDING,
      outcomes: params.outcomeStatus ? [{ status: params.outcomeStatus }] : [],
    };
  }

  it(`skips selection when advisory lock is not acquired`, async () => {
    const { repository, ledgerEntryFindMany } = createRepository({ lockAcquired: false });

    await expect(repository.selectPendingStripeIdsForRun()).resolves.toEqual({ skipped: true });

    expect(ledgerEntryFindMany).not.toHaveBeenCalled();
  });

  it(`selects both pending payment and deposit reversals`, async () => {
    const { repository, ledgerEntryFindMany } = createRepository({
      pendingEntries: [makePendingEntry({ stripeId: `re_1` })],
    });

    await repository.selectPendingStripeIdsForRun();

    expect(ledgerEntryFindMany).toHaveBeenCalledWith({
      where: {
        type: {
          in: [$Enums.LedgerEntryType.USER_PAYMENT_REVERSAL, $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL],
        },
        stripeId: { not: null },
        createdBy: { not: `stripe` },
      },
      select: {
        stripeId: true,
        status: true,
        outcomes: {
          orderBy: { createdAt: `desc` },
          take: 1,
          select: { status: true },
        },
      },
    });
  });

  it(`keeps rows with effective pending status and dedupes stripe ids`, async () => {
    const { repository } = createRepository({
      pendingEntries: [
        makePendingEntry({ stripeId: `re_1` }),
        makePendingEntry({ stripeId: `re_1` }),
        makePendingEntry({
          stripeId: `re_drifted`,
          status: $Enums.TransactionStatus.COMPLETED,
          outcomeStatus: $Enums.TransactionStatus.PENDING,
        }),
        makePendingEntry({ stripeId: `re_completed`, outcomeStatus: $Enums.TransactionStatus.COMPLETED }),
      ],
    });

    await expect(repository.selectPendingStripeIdsForRun()).resolves.toEqual({
      skipped: false,
      pendingStripeIds: 2,
      stripeIdsForRun: [`re_1`, `re_drifted`],
    });
  });

  it(`limits selected stripe ids per run`, async () => {
    const { repository } = createRepository({
      pendingEntries: Array.from({ length: 80 }, (_, i) => makePendingEntry({ stripeId: `re_${i + 1}` })),
    });

    const selection = await repository.selectPendingStripeIdsForRun();

    expect(selection).toEqual(
      expect.objectContaining({
        skipped: false,
        pendingStripeIds: 80,
      }),
    );
    if (!(`stripeIdsForRun` in selection)) {
      throw new Error(`Expected reversal selection to acquire the lock`);
    }
    expect(selection.stripeIdsForRun).toHaveLength(50);
  });

  it(`appends idempotent outcomes for all matching reversal entries`, async () => {
    const entriesByStripeId = new Map([[`re_1`, [{ id: `ledger-1` }, { id: `ledger-2` }]]]);
    const { repository } = createRepository({ entriesByStripeId });

    await repository.recordRefundOutcome({
      stripeId: `re_1`,
      status: $Enums.TransactionStatus.COMPLETED,
      externalId: `reconcile:re_1:${$Enums.TransactionStatus.COMPLETED}`,
      logger: { warn: jest.fn<(...a: any[]) => any>() } as any,
    });

    expect(createOutcomeIdempotentMock).toHaveBeenCalledTimes(2);
    expect(createOutcomeIdempotentMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ledgerEntryId: `ledger-1`,
        status: $Enums.TransactionStatus.COMPLETED,
        source: `stripe-reconcile`,
        externalId: `reconcile:re_1:${$Enums.TransactionStatus.COMPLETED}`,
      }),
      expect.anything(),
    );
    expect(createOutcomeIdempotentMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ledgerEntryId: `ledger-2`,
        status: $Enums.TransactionStatus.COMPLETED,
        source: `stripe-reconcile`,
        externalId: `reconcile:re_1:${$Enums.TransactionStatus.COMPLETED}`,
      }),
      expect.anything(),
    );
  });
});
