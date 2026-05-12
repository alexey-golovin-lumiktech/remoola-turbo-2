import { randomUUID } from 'crypto';

import { Injectable, Logger } from '@nestjs/common';

import { type NotificationOutboxModel } from '@remoola/database-2';

import { StripeWebhookReversalNotificationService } from './stripe-webhook-reversal-notification.service';
import {
  STRIPE_REVERSAL_EMAIL_OUTBOX_EVENT_TYPE,
  parseStripeReversalEmailOutboxPayload,
} from './stripe-webhook-reversal-outbox';
import { PrismaService } from '../../../shared/prisma.service';

const RETRYABLE_OUTBOX_STATUSES = [`PENDING`, `FAILED`] as const;

@Injectable()
export class StripeWebhookReversalNotificationOutboxService {
  private static readonly MAX_BATCH_SIZE = 25;
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly BASE_RETRY_DELAY_MS = 60_000;
  private static readonly PROCESSING_STALE_MS = 10 * 60 * 1000;

  private readonly logger = new Logger(StripeWebhookReversalNotificationOutboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reversalNotifications: StripeWebhookReversalNotificationService,
  ) {}

  private getRetryDelayMs(attempt: number) {
    return Math.min(
      60 * 60 * 1000,
      StripeWebhookReversalNotificationOutboxService.BASE_RETRY_DELAY_MS * 2 ** Math.max(0, attempt - 1),
    );
  }

  private normalizeError(error: unknown) {
    return {
      errorClass: error instanceof Error ? error.name : `UnknownError`,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  private async claimDueRows(limit = StripeWebhookReversalNotificationOutboxService.MAX_BATCH_SIZE) {
    const claimToken = randomUUID();
    const now = new Date();
    const staleProcessingBefore = new Date(
      now.getTime() - StripeWebhookReversalNotificationOutboxService.PROCESSING_STALE_MS,
    );
    return this.prisma.$transaction(async (tx) => {
      const candidates = await tx.notificationOutboxModel.findMany({
        where: {
          eventType: STRIPE_REVERSAL_EMAIL_OUTBOX_EVENT_TYPE,
          OR: [
            {
              status: { in: [...RETRYABLE_OUTBOX_STATUSES] },
              nextAttemptAt: { lte: now },
            },
            {
              status: `PROCESSING`,
              processingStartedAt: { lt: staleProcessingBefore },
            },
          ],
        },
        orderBy: [{ nextAttemptAt: `asc` }, { createdAt: `asc` }],
        take: limit,
      });

      const claimed: NotificationOutboxModel[] = [];
      for (const candidate of candidates) {
        const result = await tx.notificationOutboxModel.updateMany({
          where: {
            id: candidate.id,
            eventType: STRIPE_REVERSAL_EMAIL_OUTBOX_EVENT_TYPE,
            OR: [
              {
                status: { in: [...RETRYABLE_OUTBOX_STATUSES] },
                nextAttemptAt: { lte: now },
              },
              {
                status: `PROCESSING`,
                processingStartedAt: { lt: staleProcessingBefore },
              },
            ],
          },
          data: {
            status: `PROCESSING`,
            claimToken,
            processingStartedAt: now,
            attemptCount: { increment: 1 },
            lastErrorClass: null,
            lastErrorMessage: null,
          },
        });
        if (result.count === 1) {
          claimed.push({
            ...candidate,
            claimToken,
            status: `PROCESSING`,
            processingStartedAt: now,
            attemptCount: candidate.attemptCount + 1,
          });
        }
      }
      return claimed;
    });
  }

  private async markSent(row: NotificationOutboxModel) {
    const now = new Date();
    await this.prisma.notificationOutboxModel.updateMany({
      where: { id: row.id, claimToken: row.claimToken, status: `PROCESSING` },
      data: {
        status: `SENT`,
        sentAt: now,
        failedAt: null,
        claimToken: null,
        processingStartedAt: null,
      },
    });
  }

  private async markFailed(row: NotificationOutboxModel, error: unknown) {
    const attempt = row.attemptCount;
    const nextStatus = attempt >= StripeWebhookReversalNotificationOutboxService.MAX_ATTEMPTS ? `DEAD` : `FAILED`;
    const { errorClass, errorMessage } = this.normalizeError(error);
    const now = new Date();
    await this.prisma.notificationOutboxModel.updateMany({
      where: { id: row.id, claimToken: row.claimToken, status: `PROCESSING` },
      data: {
        status: nextStatus,
        failedAt: now,
        nextAttemptAt: new Date(now.getTime() + this.getRetryDelayMs(attempt)),
        claimToken: null,
        processingStartedAt: null,
        lastErrorClass: errorClass,
        lastErrorMessage: errorMessage,
      },
    });
  }

  async processDueRows(limit = StripeWebhookReversalNotificationOutboxService.MAX_BATCH_SIZE) {
    const claimed = await this.claimDueRows(limit);
    let sent = 0;
    let failed = 0;

    for (const row of claimed) {
      try {
        const payload = parseStripeReversalEmailOutboxPayload(row.payload);
        await this.reversalNotifications.sendReversalEmail(payload);
        await this.markSent(row);
        sent += 1;
      } catch (error) {
        failed += 1;
        await this.markFailed(row, error);
        this.logger.warn({
          event: `stripe_reversal_notification_outbox_failed`,
          outboxId: row.id,
          errorClass: error instanceof Error ? error.name : `UnknownError`,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (claimed.length > 0) {
      this.logger.log({
        event: `stripe_reversal_notification_outbox_complete`,
        claimed: claimed.length,
        sent,
        failed,
      });
    }

    return { claimed: claimed.length, sent, failed };
  }
}
