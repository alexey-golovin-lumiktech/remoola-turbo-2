import { $Enums } from '@remoola/database-2';

import { StripeCheckoutScheduler } from './stripe-checkout.scheduler';
import { type PrismaService } from '../../../shared/prisma.service';

describe(`StripeCheckoutScheduler`, () => {
  let scheduler: StripeCheckoutScheduler;
  let prisma: {
    $transaction: jest.Mock;
  };
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let sessionsRetrieveMock: jest.Mock;
  let finalizeCheckoutSessionSuccessMock: jest.Mock;
  let lockAcquired: boolean;
  let sessionIds: string[];

  beforeEach(() => {
    lockAcquired = true;
    sessionIds = [`cs_test_1`, `cs_test_1`];
    sessionsRetrieveMock = jest.fn().mockResolvedValue({
      id: `cs_test_1`,
      payment_status: `paid`,
      metadata: { paymentRequestId: `pr-1`, consumerId: `consumer-1` },
    });
    finalizeCheckoutSessionSuccessMock = jest.fn().mockResolvedValue(undefined);
    prisma = {
      $transaction: jest.fn().mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([{ locked: lockAcquired }]),
          ledgerEntryModel: {
            findMany: jest.fn().mockResolvedValue(
              sessionIds.map((sessionId) => ({
                status: $Enums.TransactionStatus.PENDING,
                outcomes: [
                  {
                    status: $Enums.TransactionStatus.WAITING,
                    source: `stripe`,
                    externalId: sessionId,
                  },
                ],
              })),
            ),
          },
        };
        return cb(tx);
      }),
    };
    scheduler = new StripeCheckoutScheduler(
      prisma as unknown as PrismaService,
      { finalizeCheckoutSessionSuccess: finalizeCheckoutSessionSuccessMock } as any,
    );
    (
      scheduler as unknown as {
        stripe: { checkout: { sessions: { retrieve: (id: string) => Promise<{ payment_status: string }> } } };
      }
    ).stripe = { checkout: { sessions: { retrieve: sessionsRetrieveMock } } };
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
    lockAcquired = false;

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
