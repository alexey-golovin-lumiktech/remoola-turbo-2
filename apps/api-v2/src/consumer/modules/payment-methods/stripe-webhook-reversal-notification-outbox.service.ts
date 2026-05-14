import { randomUUID } from 'crypto';

import { Injectable, Logger } from '@nestjs/common';

import {
  type ClaimedReversalNotificationOutboxRow,
  StripeWebhookReversalNotificationOutboxRepository,
} from './stripe-webhook-reversal-notification-outbox.repository';
import { StripeWebhookReversalNotificationService } from './stripe-webhook-reversal-notification.service';
import {
  STRIPE_REVERSAL_EMAIL_OUTBOX_EVENT_TYPE,
  parseStripeReversalEmailOutboxPayload,
} from './stripe-webhook-reversal-outbox';

const RETRYABLE_OUTBOX_STATUSES = [`PENDING`, `FAILED`] as const;

@Injectable()
export class StripeWebhookReversalNotificationOutboxService {
  private static readonly MAX_BATCH_SIZE = 25;
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly BASE_RETRY_DELAY_MS = 60_000;
  private static readonly PROCESSING_STALE_MS = 10 * 60 * 1000;

  private readonly logger = new Logger(StripeWebhookReversalNotificationOutboxService.name);

  constructor(
    private readonly outboxRepository: StripeWebhookReversalNotificationOutboxRepository,
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
    return this.outboxRepository.claimDueRows({
      eventType: STRIPE_REVERSAL_EMAIL_OUTBOX_EVENT_TYPE,
      retryableStatuses: RETRYABLE_OUTBOX_STATUSES,
      processingStatus: `PROCESSING`,
      claimToken,
      now,
      staleProcessingBefore,
      limit,
    });
  }

  private async markSent(row: ClaimedReversalNotificationOutboxRow) {
    const now = new Date();
    await this.outboxRepository.markSent({
      row,
      processingStatus: `PROCESSING`,
      sentStatus: `SENT`,
      now,
    });
  }

  private async markFailed(row: ClaimedReversalNotificationOutboxRow, error: unknown) {
    const attempt = row.attemptCount;
    const nextStatus = attempt >= StripeWebhookReversalNotificationOutboxService.MAX_ATTEMPTS ? `DEAD` : `FAILED`;
    const { errorClass, errorMessage } = this.normalizeError(error);
    const now = new Date();
    await this.outboxRepository.markFailed({
      row,
      processingStatus: `PROCESSING`,
      nextStatus,
      failedAt: now,
      nextAttemptAt: new Date(now.getTime() + this.getRetryDelayMs(attempt)),
      errorClass,
      errorMessage,
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
