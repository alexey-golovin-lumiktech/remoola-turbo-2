import { randomUUID } from 'crypto';

import { Injectable } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { PrismaService } from '../../../shared/prisma.service';

import type Stripe from 'stripe';

export const STRIPE_WEBHOOK_EVENT_STATUS = {
  PROCESSING: `PROCESSING`,
  PROCESSED: `PROCESSED`,
  FAILED: `FAILED`,
} as const;

export type StripeWebhookEventStatus = (typeof STRIPE_WEBHOOK_EVENT_STATUS)[keyof typeof STRIPE_WEBHOOK_EVENT_STATUS];

export type StripeWebhookEventClaimResult =
  | { result: `claimed`; claimToken: string }
  | { result: `duplicate` }
  | { result: `inFlight` };

export const STRIPE_WEBHOOK_PROCESSING_STALE_AFTER_MS = 15 * 60 * 1000;
const MAX_STORED_ERROR_MESSAGE_LENGTH = 500;

@Injectable()
export class StripeWebhookDeduplicationService {
  constructor(private readonly prisma: PrismaService) {}

  async hasProcessed(eventId: string) {
    const processedEvent = await this.prisma.stripeWebhookEventModel.findUnique({
      where: { eventId },
      select: { eventId: true, status: true },
    });
    return processedEvent?.status === STRIPE_WEBHOOK_EVENT_STATUS.PROCESSED;
  }

  async claim(event: Pick<Stripe.Event, `id` | `type`>): Promise<StripeWebhookEventClaimResult> {
    const now = new Date();
    const claimToken = randomUUID();
    try {
      await this.prisma.stripeWebhookEventModel.create({
        data: {
          eventId: event.id,
          eventType: event.type,
          status: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSING,
          claimToken,
          processingStartedAt: now,
          attemptCount: 1,
        },
      });
      return { result: `claimed`, claimToken };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== `P2002`) {
        throw error;
      }
    }

    const existingEvent = await this.prisma.stripeWebhookEventModel.findUnique({
      where: { eventId: event.id },
      select: {
        status: true,
        processingStartedAt: true,
      },
    });

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
    const reclaimResult = await this.prisma.stripeWebhookEventModel.updateMany({
      where: {
        eventId: event.id,
        OR: [
          { status: STRIPE_WEBHOOK_EVENT_STATUS.FAILED },
          {
            status: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSING,
            processingStartedAt: { lte: staleCutoff },
          },
        ],
      },
      data: {
        eventType: event.type,
        status: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSING,
        claimToken,
        processingStartedAt: now,
        failedAt: null,
        lastErrorClass: null,
        lastErrorMessage: null,
        attemptCount: { increment: 1 },
      },
    });

    return reclaimResult.count === 1 ? { result: `claimed`, claimToken } : { result: `inFlight` };
  }

  async markProcessed(eventId: string, claimToken: string) {
    await this.prisma.stripeWebhookEventModel.updateMany({
      where: {
        eventId,
        status: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSING,
        claimToken,
      },
      data: {
        status: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSED,
        processedAt: new Date(),
        failedAt: null,
        lastErrorClass: null,
        lastErrorMessage: null,
      },
    });
  }

  async markFailed(eventId: string, claimToken: string, error: unknown) {
    const normalizedError = this.normalizeError(error);
    await this.prisma.stripeWebhookEventModel.updateMany({
      where: {
        eventId,
        status: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSING,
        claimToken,
      },
      data: {
        status: STRIPE_WEBHOOK_EVENT_STATUS.FAILED,
        failedAt: new Date(),
        lastErrorClass: normalizedError.errorClass,
        lastErrorMessage: normalizedError.errorMessage,
      },
    });
  }

  async recordProcessed(eventId: string) {
    try {
      await this.prisma.stripeWebhookEventModel.create({
        data: {
          eventId,
          status: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSED,
          processedAt: new Date(),
          attemptCount: 1,
        },
      });
      return `created` as const;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === `P2002`) {
        return `duplicate` as const;
      }
      throw error;
    }
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
