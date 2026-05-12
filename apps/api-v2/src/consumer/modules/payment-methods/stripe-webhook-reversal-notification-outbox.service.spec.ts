import { $Enums } from '@remoola/database-2';

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
    const tx = {
      notificationOutboxModel: {
        findMany: jest.fn().mockResolvedValue([row]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (txArg: unknown) => Promise<unknown>) => callback(tx)),
      notificationOutboxModel: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as any;
    const reversalNotifications = {
      sendReversalEmail: jest.fn().mockResolvedValue(undefined),
    } as any;
    const service = new StripeWebhookReversalNotificationOutboxService(prisma, reversalNotifications);

    await expect(service.processDueRows()).resolves.toEqual({ claimed: 1, sent: 1, failed: 0 });

    expect(reversalNotifications.sendReversalEmail).toHaveBeenCalledWith(row.payload);
    expect(prisma.notificationOutboxModel.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: row.id, status: `PROCESSING` }),
        data: expect.objectContaining({ status: `SENT`, sentAt: expect.any(Date) }),
      }),
    );
  });

  it(`keeps failed sends retryable without touching ledger state`, async () => {
    const row = makeRow({ attemptCount: 1 });
    const tx = {
      notificationOutboxModel: {
        findMany: jest.fn().mockResolvedValue([row]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (txArg: unknown) => Promise<unknown>) => callback(tx)),
      notificationOutboxModel: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as any;
    const reversalNotifications = {
      sendReversalEmail: jest.fn().mockRejectedValue(new Error(`Brevo down`)),
    } as any;
    const service = new StripeWebhookReversalNotificationOutboxService(prisma, reversalNotifications);

    await expect(service.processDueRows()).resolves.toEqual({ claimed: 1, sent: 0, failed: 1 });

    expect(prisma.notificationOutboxModel.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: row.id, status: `PROCESSING` }),
        data: expect.objectContaining({
          status: `FAILED`,
          lastErrorClass: `Error`,
          lastErrorMessage: `Brevo down`,
          nextAttemptAt: expect.any(Date),
        }),
      }),
    );
  });

  it(`reclaims stale processing rows after crash or restart`, async () => {
    const row = makeRow({
      status: `PROCESSING`,
      attemptCount: 2,
      processingStartedAt: new Date(`2026-05-12T09:00:00.000Z`),
      claimToken: `abandoned-claim`,
    });
    const tx = {
      notificationOutboxModel: {
        findMany: jest.fn().mockResolvedValue([row]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (txArg: unknown) => Promise<unknown>) => callback(tx)),
      notificationOutboxModel: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as any;
    const reversalNotifications = {
      sendReversalEmail: jest.fn().mockResolvedValue(undefined),
    } as any;
    const service = new StripeWebhookReversalNotificationOutboxService(prisma, reversalNotifications);

    await expect(service.processDueRows()).resolves.toEqual({ claimed: 1, sent: 1, failed: 0 });

    expect(tx.notificationOutboxModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              status: `PROCESSING`,
              processingStartedAt: expect.objectContaining({ lt: expect.any(Date) }),
            }),
          ]),
        }),
      }),
    );
    expect(tx.notificationOutboxModel.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: row.id,
          OR: expect.arrayContaining([
            expect.objectContaining({
              status: `PROCESSING`,
              processingStartedAt: expect.objectContaining({ lt: expect.any(Date) }),
            }),
          ]),
        }),
        data: expect.objectContaining({
          status: `PROCESSING`,
          claimToken: expect.any(String),
          attemptCount: { increment: 1 },
        }),
      }),
    );
  });
});
