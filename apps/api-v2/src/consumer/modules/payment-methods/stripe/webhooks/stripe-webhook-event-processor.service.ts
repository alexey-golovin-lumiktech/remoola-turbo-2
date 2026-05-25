import { Injectable, Logger } from '@nestjs/common';

import { StripeWebhookDeduplicationService } from './stripe-webhook-deduplication.service';

import type Stripe from 'stripe';

type StripeWebhookEventProcessorResult = `processed` | `duplicate` | `inFlight`;

@Injectable()
export class StripeWebhookEventProcessorService {
  private readonly logger = new Logger(StripeWebhookEventProcessorService.name);

  constructor(private readonly deduplicationService: StripeWebhookDeduplicationService) {}

  async process(event: Stripe.Event, handler: () => Promise<void>): Promise<StripeWebhookEventProcessorResult> {
    const claimResult = await this.deduplicationService.claim(event);
    if (claimResult.result === `duplicate`) {
      this.logSkip(event, `duplicate`);
      return `duplicate`;
    }
    if (claimResult.result === `inFlight`) {
      this.logSkip(event, `inFlight`);
      return `inFlight`;
    }

    try {
      await handler();
      await this.deduplicationService.markProcessed(event.id, claimResult.claimToken);
      return `processed`;
    } catch (error) {
      await this.deduplicationService.markFailed(event.id, claimResult.claimToken, error);
      throw error;
    }
  }

  private logSkip(event: Stripe.Event, reason: `duplicate` | `inFlight`) {
    this.logger.debug({
      message: `Stripe webhook duplicate event, skipping`,
      eventId: event.id,
      eventType: event.type,
      reason,
    });
  }
}
