import { Logger } from '@nestjs/common';

import { $Enums, type Prisma } from '@remoola/database-2';

/* eslint-disable-next-line max-len */
import { type AdminV2PaymentReversalRefundFinalizerService } from './admin-v2-payment-reversal-refund-finalizer.service';
import { buildAdminRefundFinalizationOutboxRow } from './admin-v2-payment-reversal-refund-outbox';
/* eslint-disable-next-line max-len */
import { type AdminV2PaymentReversalRefundOutboxRepository } from './admin-v2-payment-reversal-refund-outbox.repository';
import { AdminV2PaymentReversalRefundOutboxService } from './admin-v2-payment-reversal-refund-outbox.service';

describe(`AdminV2PaymentReversalRefundOutboxService`, () => {
  const payload = {
    paymentRequestId: `11111111-1111-4111-8111-111111111111`,
    ledgerId: `22222222-2222-4222-8222-222222222222`,
    adminId: `33333333-3333-4333-8333-333333333333`,
    stripePaymentIntentId: `pi_refund_outbox`,
    idempotencyKeyBase: `refund-base`,
    existingStripeRefundId: null,
    amount: `25`,
    currencyCode: $Enums.CurrencyCode.USD,
    reason: `customer request`,
  };

  function buildRow(overrides: Record<string, unknown> = {}) {
    const outboxRow = buildAdminRefundFinalizationOutboxRow(payload);
    return {
      id: `44444444-4444-4444-8444-444444444444`,
      ...outboxRow,
      status: `PROCESSING`,
      attemptCount: 1,
      claimToken: `claim-token`,
      processingStartedAt: new Date(`2026-05-15T12:00:00.000Z`),
      sentAt: null,
      failedAt: null,
      lastErrorClass: null,
      lastErrorMessage: null,
      nextAttemptAt: new Date(`2026-05-15T12:00:00.000Z`),
      createdAt: new Date(`2026-05-15T12:00:00.000Z`),
      updatedAt: new Date(`2026-05-15T12:00:00.000Z`),
      ...overrides,
    };
  }

  function buildService(rows: ReturnType<typeof buildRow>[]) {
    const outboxRepository = {
      claimDueRows: jest.fn().mockResolvedValue(rows),
      markSent: jest.fn().mockResolvedValue({ count: 1 }),
      markFailed: jest.fn().mockResolvedValue({ count: 1 }),
    } as unknown as jest.Mocked<AdminV2PaymentReversalRefundOutboxRepository>;
    const refundFinalizer = {
      finalizeQueuedPayload: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AdminV2PaymentReversalRefundFinalizerService>;
    const service = new AdminV2PaymentReversalRefundOutboxService(outboxRepository, refundFinalizer);

    return { service, outboxRepository, refundFinalizer };
  }

  it(`claims due rows and marks successfully finalized payloads sent`, async () => {
    const row = buildRow();
    const { service, outboxRepository, refundFinalizer } = buildService([row]);

    await expect(service.processDueRows(3)).resolves.toEqual({ claimed: 1, finalized: 1, failed: 0 });

    expect(outboxRepository.claimDueRows).toHaveBeenCalledWith({ limit: 3 });
    expect(refundFinalizer.finalizeQueuedPayload).toHaveBeenCalledWith(payload);
    expect(outboxRepository.markSent).toHaveBeenCalledWith(row);
    expect(outboxRepository.markFailed).not.toHaveBeenCalled();
  });

  it(`marks failed rows and continues the batch when finalization fails`, async () => {
    const loggerWarn = jest.spyOn(Logger.prototype, `warn`).mockImplementation(() => undefined);
    const row = buildRow();
    const error = new Error(`stripe down`);
    const { service, outboxRepository, refundFinalizer } = buildService([row]);
    refundFinalizer.finalizeQueuedPayload.mockRejectedValueOnce(error);

    try {
      await expect(service.processDueRows()).resolves.toEqual({ claimed: 1, finalized: 0, failed: 1 });
    } finally {
      loggerWarn.mockRestore();
    }

    expect(outboxRepository.markFailed).toHaveBeenCalledWith(row, error);
    expect(outboxRepository.markSent).not.toHaveBeenCalled();
  });

  it(`marks invalid payload rows failed without throwing the whole drain`, async () => {
    const loggerWarn = jest.spyOn(Logger.prototype, `warn`).mockImplementation(() => undefined);
    const row = buildRow({ payload: { invalid: true } as Prisma.JsonObject });
    const { service, outboxRepository, refundFinalizer } = buildService([row]);

    try {
      await expect(service.processDueRows()).resolves.toEqual({ claimed: 1, finalized: 0, failed: 1 });
    } finally {
      loggerWarn.mockRestore();
    }

    expect(refundFinalizer.finalizeQueuedPayload).not.toHaveBeenCalled();
    expect(outboxRepository.markFailed).toHaveBeenCalledWith(row, expect.any(Error));
  });
});
