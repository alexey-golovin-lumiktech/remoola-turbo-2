import { randomUUID } from 'crypto';

import { Injectable } from '@nestjs/common';

import { StripeWebhookDeduplicationRepository } from './stripe-webhook-deduplication.repository';

import type Stripe from 'stripe';

export const STRIPE_WEBHOOK_EVENT_STATUS = {
  PROCESSING: `PROCESSING`,
  PROCESSED: `PROCESSED`,
  FAILED: `FAILED`,
} as const;

type StripeWebhookEventClaimResult =
  | { result: `claimed`; claimToken: string }
  | { result: `duplicate` }
  | { result: `inFlight` };

const STRIPE_WEBHOOK_PROCESSING_STALE_AFTER_MS = 15 * 60 * 1000;
const MAX_STORED_ERROR_MESSAGE_LENGTH = 500;

@Injectable()
export class StripeWebhookDeduplicationService {
  constructor(private readonly repository: StripeWebhookDeduplicationRepository) {}

  async hasProcessed(eventId: string) {
    const processedEvent = await this.repository.findStatus(eventId);
    return processedEvent?.status === STRIPE_WEBHOOK_EVENT_STATUS.PROCESSED;
  }

  async claim(event: Pick<Stripe.Event, `id` | `type`>): Promise<StripeWebhookEventClaimResult> {
    const now = new Date();
    const claimToken = randomUUID();

    const createResult = await this.repository.tryCreateProcessingClaim({
      eventId: event.id,
      eventType: event.type,
      status: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSING,
      claimToken,
      now,
    });
    if (createResult === `created`) {
      return { result: `claimed`, claimToken };
    }

    const existingEvent = await this.repository.findProcessingState(event.id);

    if (!existingEvent || existingEvent.status === STRIPE_WEBHOOK_EVENT_STATUS.PROCESSED) {
      return { result: `duplicate` };
    }

    if (
      existingEvent.status === STRIPE_WEBHOOK_EVENT_STATUS.PROCESSING &&
      !this.isProcessingStale(existingEvent.processingStartedAt, now)
    ) {
      return { result: `inFlight` };
    }

    const staleCutoff = new Date(now.getTime() - STRIPE_WEBHOOK_PROCESSING_STALE_AFTER_MS);
    const reclaimed = await this.repository.tryReclaimProcessingClaim({
      eventId: event.id,
      eventType: event.type,
      status: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSING,
      failedStatus: STRIPE_WEBHOOK_EVENT_STATUS.FAILED,
      claimToken,
      now,
      staleCutoff,
    });

    return reclaimed ? { result: `claimed`, claimToken } : { result: `inFlight` };
  }

  async markProcessed(eventId: string, claimToken: string) {
    await this.repository.markProcessed({
      eventId,
      claimToken,
      processingStatus: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSING,
      processedStatus: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSED,
      now: new Date(),
    });
  }

  async markFailed(eventId: string, claimToken: string, error: unknown) {
    const normalizedError = this.normalizeError(error);
    await this.repository.markFailed({
      eventId,
      claimToken,
      processingStatus: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSING,
      failedStatus: STRIPE_WEBHOOK_EVENT_STATUS.FAILED,
      now: new Date(),
      errorClass: normalizedError.errorClass,
      errorMessage: normalizedError.errorMessage,
    });
  }

  async recordProcessed(eventId: string) {
    return this.repository.tryRecordProcessed(eventId, STRIPE_WEBHOOK_EVENT_STATUS.PROCESSED, new Date());
  }

  private isProcessingStale(processingStartedAt: Date | null, now: Date) {
    if (!processingStartedAt) return true;
    return now.getTime() - processingStartedAt.getTime() >= STRIPE_WEBHOOK_PROCESSING_STALE_AFTER_MS;
  }

  private normalizeError(error: unknown) {
    const err = error instanceof Error ? error : null;
    return {
      errorClass: err?.name ?? `UnknownError`,
      errorMessage: (err?.message ?? String(error)).slice(0, MAX_STORED_ERROR_MESSAGE_LENGTH),
    };
  }
}
