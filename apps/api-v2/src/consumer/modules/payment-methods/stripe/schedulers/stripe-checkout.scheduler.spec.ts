import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { $Enums } from '@remoola/database-2';

import { StripeCheckoutSchedulerRepository } from './stripe-checkout-scheduler.repository';
import { StripeCheckoutScheduler } from './stripe-checkout.scheduler';

type CheckoutSchedulerSelection =
  | { skipped: true }
  | { skipped: false; sessionIdsForRun: string[]; pendingSessionIds: number };

describe(`StripeCheckoutScheduler`, () => {
  let scheduler: StripeCheckoutScheduler;
  let checkoutSchedulerRepository: jest.Mocked<StripeCheckoutSchedulerRepository>;
  let logSpy: jest.SpiedFunction<(...a: any[]) => any>;
  let warnSpy: jest.SpiedFunction<(...a: any[]) => any>;
  let sessionsRetrieveMock: jest.Mock<(...a: any[]) => any>;
  let finalizeCheckoutSessionSuccessMock: jest.Mock<(...a: any[]) => any>;
  let selection: CheckoutSchedulerSelection;

  beforeEach(() => {
    selection = { skipped: false, sessionIdsForRun: [`cs_test_1`], pendingSessionIds: 1 };
    sessionsRetrieveMock = jest.fn<(...a: any[]) => any>().mockResolvedValue({
      id: `cs_test_1`,
      payment_status: `paid`,
      metadata: { paymentRequestId: `pr-1`, consumerId: `consumer-1` },
    });
    finalizeCheckoutSessionSuccessMock = jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined);
    checkoutSchedulerRepository = {
      selectWaitingSessionIdsForRun: jest.fn<(...a: any[]) => any>().mockImplementation(async () => selection),
    } as unknown as jest.Mocked<StripeCheckoutSchedulerRepository>;
    scheduler = new StripeCheckoutScheduler(
      checkoutSchedulerRepository,
      { finalizeCheckoutSessionSuccess: finalizeCheckoutSessionSuccessMock } as any,
      { checkout: { sessions: { retrieve: sessionsRetrieveMock } } } as any,
    );
    logSpy = jest
      .spyOn((scheduler as unknown as { logger: { log: (...args: unknown[]) => void } }).logger, `log`)
      .mockImplementation(() => undefined);
    warnSpy = jest
      .spyOn((scheduler as unknown as { logger: { warn: (...args: unknown[]) => void } }).logger, `warn`)
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it(`reconciles paid checkout sessions into webhook finalization`, async () => {
    await expect(scheduler.reconcileWaitingCheckouts()).resolves.toBeUndefined();

    expect(sessionsRetrieveMock).toHaveBeenCalledWith(`cs_test_1`, {
      expand: [`payment_intent`],
    });
    expect(finalizeCheckoutSessionSuccessMock).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith({
      event: `stripe_checkout_reconcile_complete`,
      pendingSessionIds: 1,
      processedSessionIds: 1,
      processed: 1,
      failed: 0,
    });
  });

  it(`skips run when advisory lock is not acquired`, async () => {
    selection = { skipped: true };

    await expect(scheduler.reconcileWaitingCheckouts()).resolves.toBeUndefined();

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: `stripe_checkout_reconcile_skipped_lock_not_acquired`,
      }),
    );
    expect(sessionsRetrieveMock).not.toHaveBeenCalled();
    expect(finalizeCheckoutSessionSuccessMock).not.toHaveBeenCalled();
  });

  it(`keeps per-session warn and increments failed count on item error`, async () => {
    sessionsRetrieveMock.mockRejectedValue(new Error(`stripe failure`));

    await expect(scheduler.reconcileWaitingCheckouts()).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: `Failed to reconcile checkout session`,
        sessionId: `cs_test_1`,
      }),
    );
    expect(logSpy).toHaveBeenCalledWith({
      event: `stripe_checkout_reconcile_complete`,
      pendingSessionIds: 1,
      processedSessionIds: 1,
      processed: 0,
      failed: 1,
    });
  });
});

describe(`StripeCheckoutSchedulerRepository`, () => {
  function createRepository(params?: {
    lockAcquired?: boolean;
    waitingEntries?: Array<{
      status: $Enums.TransactionStatus;
      outcomes: Array<{
        status: $Enums.TransactionStatus;
        source: string | null;
        externalId: string | null;
      }>;
    }>;
  }) {
    const ledgerEntryFindMany = jest.fn<(...a: any[]) => any>().mockResolvedValue(params?.waitingEntries ?? []);
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
      repository: new StripeCheckoutSchedulerRepository(prisma),
      tx,
      ledgerEntryFindMany,
      prisma,
    };
  }

  function makeEntry(params: {
    status?: $Enums.TransactionStatus;
    outcomeStatus?: $Enums.TransactionStatus;
    source?: string | null;
    externalId?: string | null;
  }) {
    return {
      status: params.status ?? $Enums.TransactionStatus.PENDING,
      outcomes: [
        {
          status: params.outcomeStatus ?? $Enums.TransactionStatus.WAITING,
          source: params.source ?? `stripe`,
          externalId: params.externalId ?? `cs_test_1`,
        },
      ],
    };
  }

  it(`skips selection when advisory lock is not acquired`, async () => {
    const { repository, ledgerEntryFindMany } = createRepository({ lockAcquired: false });

    await expect(repository.selectWaitingSessionIdsForRun()).resolves.toEqual({ skipped: true });

    expect(ledgerEntryFindMany).not.toHaveBeenCalled();
  });

  it(`dedupes waiting Stripe checkout session ids`, async () => {
    const { repository } = createRepository({
      waitingEntries: [
        makeEntry({ externalId: `cs_test_1` }),
        makeEntry({ externalId: `cs_test_1` }),
        makeEntry({ externalId: `cs_test_2` }),
        makeEntry({ externalId: `pi_not_checkout` }),
        makeEntry({ source: `manual`, externalId: `cs_manual` }),
        makeEntry({ outcomeStatus: $Enums.TransactionStatus.COMPLETED, externalId: `cs_completed` }),
      ],
    });

    await expect(repository.selectWaitingSessionIdsForRun()).resolves.toEqual({
      skipped: false,
      pendingSessionIds: 2,
      sessionIdsForRun: [`cs_test_1`, `cs_test_2`],
    });
  });

  it(`limits selected checkout session ids per run`, async () => {
    const { repository } = createRepository({
      waitingEntries: Array.from({ length: 55 }, (_, index) => makeEntry({ externalId: `cs_test_${index}` })),
    });

    const selection = await repository.selectWaitingSessionIdsForRun();

    expect(selection).toEqual(
      expect.objectContaining({
        skipped: false,
        pendingSessionIds: 55,
      }),
    );
    if (!(`sessionIdsForRun` in selection)) {
      throw new Error(`Expected checkout selection to acquire the lock`);
    }
    expect(selection.sessionIdsForRun).toHaveLength(50);
  });
});
