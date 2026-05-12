import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { StripeWebhookReversalNotificationOutboxService } from './stripe-webhook-reversal-notification-outbox.service';

@Injectable()
export class StripeWebhookReversalNotificationOutboxScheduler {
  private readonly logger = new Logger(StripeWebhookReversalNotificationOutboxScheduler.name);
  private consecutiveFailures = 0;

  constructor(private readonly outbox: StripeWebhookReversalNotificationOutboxService) {}

  @Cron(`*/1 * * * *`)
  async processDueReversalNotifications() {
    try {
      await this.outbox.processDueRows();
      this.consecutiveFailures = 0;
    } catch (error) {
      this.consecutiveFailures += 1;
      this.logger.warn({
        event: `stripe_reversal_notification_outbox_scheduler_failed`,
        consecutiveFailures: this.consecutiveFailures,
        errorClass: error instanceof Error ? error.name : `UnknownError`,
        message: error instanceof Error ? error.message : String(error),
      });
      if (this.consecutiveFailures >= 3) {
        this.logger.error({
          event: `stripe_reversal_notification_outbox_scheduler_degraded`,
          consecutiveFailures: this.consecutiveFailures,
        });
      }
    }
  }
}
