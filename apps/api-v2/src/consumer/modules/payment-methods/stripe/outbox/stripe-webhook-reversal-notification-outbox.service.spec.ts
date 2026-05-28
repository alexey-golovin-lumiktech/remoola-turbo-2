import { describe, expect, it, jest } from '@jest/globals';

import { $Enums } from '@remoola/database-2';

import { type StripeWebhookReversalNotificationOutboxRepository } from './stripe-webhook-reversal-notification-outbox.repository'; // eslint-disable-line
import { StripeWebhookReversalNotificationOutboxService } from './stripe-webhook-reversal-notification-outbox.service';
import { STRIPE_REVERSAL_EMAIL_OUTBOX_EVENT_TYPE } from './stripe-webhook-reversal-outbox';

describe(`StripeWebhookReversalNotificationOutboxService`, () => {
  function makeRow(overrides: Record<string, unknown> = {}) {
    return {
      id: `outbox-1`,
      eventType: STRIPE_REVERSAL_EMAIL_OUTBOX_EVENT_TYPE,
      aggregateType: `ledger_reversal`,
      aggregateId: `ledger-1`,
      idempotencyKey: `stripe.reversal.email_requested:reversal:refund:re_1:payer:payer`,
      payload: {
        paymentRequestId: `pr-1`,
        payerId: `payer-1`,
        requesterId: `requester-1`,
        requesterEmail: `requester@example.com`,
        amount: 12.34,
        currencyCode: $Enums.CurrencyCode.USD,
        kind: `REFUND`,
        reason: `requested_by_customer`,
        role: `payer`,
      },
      status: `PENDING`,
      attemptCount: 0,
      nextAttemptAt: new Date(`2026-05-12T10:00:00.000Z`),
      processingStartedAt: null,
      claimToken: null,
      sentAt: null,
      failedAt: null,
      lastErrorClass: null,
      lastErrorMessage: null,
      createdAt: new Date(`2026-05-12T10:00:00.000Z`),
      updatedAt: new Date(`2026-05-12T10:00:00.000Z`),
      ...overrides,
    };
  }

  it(`claims, sends, and marks due rows as sent`, async () => {
    const row = makeRow();
    const outboxRepository = {
      claimDueRows: jest.fn<(...a: any[]) => any>().mockResolvedValue([row]),
      markSent: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
      markFailed: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<StripeWebhookReversalNotificationOutboxRepository>;
    const reversalNotifications = {
      sendReversalEmail: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
    } as any;
    const service = new StripeWebhookReversalNotificationOutboxService(outboxRepository, reversalNotifications);

    await expect(service.processDueRows()).resolves.toEqual({ claimed: 1, sent: 1, failed: 0 });

    expect(reversalNotifications.sendReversalEmail).toHaveBeenCalledWith(row.payload);
    expect(outboxRepository.markSent).toHaveBeenCalledWith(
      expect.objectContaining({
        row,
        processingStatus: `PROCESSING`,
        sentStatus: `SENT`,
        now: expect.any(Date),
      }),
    );
    expect(outboxRepository.markFailed).not.toHaveBeenCalled();
  });

  it(`keeps failed sends retryable without touching ledger state`, async () => {
    const row = makeRow({ attemptCount: 1 });
    const outboxRepository = {
      claimDueRows: jest.fn<(...a: any[]) => any>().mockResolvedValue([row]),
      markSent: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
      markFailed: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<StripeWebhookReversalNotificationOutboxRepository>;
    const reversalNotifications = {
      sendReversalEmail: jest.fn<(...a: any[]) => any>().mockRejectedValue(new Error(`Brevo down`)),
    } as any;
    const service = new StripeWebhookReversalNotificationOutboxService(outboxRepository, reversalNotifications);

    await expect(service.processDueRows()).resolves.toEqual({ claimed: 1, sent: 0, failed: 1 });

    expect(outboxRepository.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        row,
        processingStatus: `PROCESSING`,
        nextStatus: `FAILED`,
        failedAt: expect.any(Date),
        nextAttemptAt: expect.any(Date),
        errorClass: `Error`,
        errorMessage: `Brevo down`,
      }),
    );
    expect(outboxRepository.markSent).not.toHaveBeenCalled();
  });

  it(`reclaims stale processing rows after crash or restart`, async () => {
    const row = makeRow({
      status: `PROCESSING`,
      attemptCount: 2,
      processingStartedAt: new Date(`2026-05-12T09:00:00.000Z`),
      claimToken: `abandoned-claim`,
    });
    const outboxRepository = {
      claimDueRows: jest.fn<(...a: any[]) => any>().mockResolvedValue([row]),
      markSent: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
      markFailed: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<StripeWebhookReversalNotificationOutboxRepository>;
    const reversalNotifications = {
      sendReversalEmail: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
    } as any;
    const service = new StripeWebhookReversalNotificationOutboxService(outboxRepository, reversalNotifications);

    await expect(service.processDueRows(3)).resolves.toEqual({ claimed: 1, sent: 1, failed: 0 });

    expect(outboxRepository.claimDueRows).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: STRIPE_REVERSAL_EMAIL_OUTBOX_EVENT_TYPE,
        retryableStatuses: [`PENDING`, `FAILED`],
        processingStatus: `PROCESSING`,
        now: expect.any(Date),
        staleProcessingBefore: expect.any(Date),
        limit: 3,
      }),
    );
    expect(outboxRepository.markSent).toHaveBeenCalledWith(
      expect.objectContaining({
        row,
        processingStatus: `PROCESSING`,
        sentStatus: `SENT`,
        now: expect.any(Date),
      }),
    );
    expect(outboxRepository.claimDueRows).toHaveBeenCalledWith(
      expect.objectContaining({
        claimToken: expect.any(String),
      }),
    );
  });

  it(`marks exhausted rows dead after max attempts`, async () => {
    const row = makeRow({ attemptCount: 5 });
    const outboxRepository = {
      claimDueRows: jest.fn<(...a: any[]) => any>().mockResolvedValue([row]),
      markSent: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
      markFailed: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<StripeWebhookReversalNotificationOutboxRepository>;
    const reversalNotifications = {
      sendReversalEmail: jest.fn<(...a: any[]) => any>().mockRejectedValue(new Error(`Permanent failure`)),
    } as any;
    const service = new StripeWebhookReversalNotificationOutboxService(outboxRepository, reversalNotifications);

    await expect(service.processDueRows()).resolves.toEqual({ claimed: 1, sent: 0, failed: 1 });

    expect(outboxRepository.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        row,
        processingStatus: `PROCESSING`,
        nextStatus: `DEAD`,
        failedAt: expect.any(Date),
        nextAttemptAt: expect.any(Date),
        errorClass: `Error`,
        errorMessage: `Permanent failure`,
      }),
    );
  });
});
