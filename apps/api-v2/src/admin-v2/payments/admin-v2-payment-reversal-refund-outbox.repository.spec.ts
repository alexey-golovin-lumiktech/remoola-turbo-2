import { describe, expect, it, jest } from '@jest/globals';

import { AdminV2PaymentReversalRefundOutboxRepository } from './admin-v2-payment-reversal-refund-outbox.repository';
import { type PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { type PrismaService } from '../../shared/prisma.service';

describe(`AdminV2PaymentReversalRefundOutboxRepository`, () => {
  function buildRepository() {
    const prisma = {
      notificationOutboxModel: {
        updateMany: jest.fn<(...a: any[]) => any>().mockResolvedValue({ count: 1 }),
      },
    };
    const repository = new AdminV2PaymentReversalRefundOutboxRepository(
      prisma as unknown as PrismaService,
      {} as PrismaTransactionRunner,
    );

    return { repository, prisma };
  }

  it(`does not downgrade terminal outbox rows when marking failed by idempotency key`, async () => {
    const { repository, prisma } = buildRepository();
    const error = new Error(`stripe down`);
    const now = new Date(`2026-05-15T12:00:00.000Z`);

    await repository.markFailedByIdempotencyKey(`outbox-key`, error, now);

    expect(prisma.notificationOutboxModel.updateMany).toHaveBeenCalledWith({
      where: { idempotencyKey: `outbox-key`, status: { notIn: [`SENT`, `DEAD`] } },
      data: {
        status: `FAILED`,
        failedAt: now,
        nextAttemptAt: new Date(`2026-05-15T12:01:00.000Z`),
        claimToken: null,
        processingStartedAt: null,
        lastErrorClass: `Error`,
        lastErrorMessage: `stripe down`,
      },
    });
  });

  it(`does not overwrite sent or dead rows when marking dead by idempotency key`, async () => {
    const { repository, prisma } = buildRepository();
    const error = new Error(`terminal stripe failure`);
    const now = new Date(`2026-05-15T12:00:00.000Z`);

    await repository.markDeadByIdempotencyKey(`outbox-key`, error, now);

    expect(prisma.notificationOutboxModel.updateMany).toHaveBeenCalledWith({
      where: { idempotencyKey: `outbox-key`, status: { notIn: [`SENT`, `DEAD`] } },
      data: {
        status: `DEAD`,
        failedAt: now,
        claimToken: null,
        processingStartedAt: null,
        lastErrorClass: `Error`,
        lastErrorMessage: `terminal stripe failure`,
      },
    });
  });

  it(`does not revive a dead row when marking sent by idempotency key`, async () => {
    const { repository, prisma } = buildRepository();
    const now = new Date(`2026-05-15T12:00:00.000Z`);

    await repository.markSentByIdempotencyKey(`outbox-key`, now);

    expect(prisma.notificationOutboxModel.updateMany).toHaveBeenCalledWith({
      where: { idempotencyKey: `outbox-key`, status: { not: `DEAD` } },
      data: {
        status: `SENT`,
        sentAt: now,
        failedAt: null,
        claimToken: null,
        processingStartedAt: null,
      },
    });
  });
});
