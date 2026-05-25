import { Injectable } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { PrismaService } from '../../../../../shared/prisma.service';

type CreateProcessingClaimParams = {
  eventId: string;
  eventType: string;
  claimToken: string;
  now: Date;
  status: string;
};

type ReclaimProcessingClaimParams = CreateProcessingClaimParams & {
  failedStatus: string;
  staleCutoff: Date;
};

type MarkProcessedParams = {
  eventId: string;
  claimToken: string;
  processingStatus: string;
  processedStatus: string;
  now: Date;
};

type MarkFailedParams = {
  eventId: string;
  claimToken: string;
  processingStatus: string;
  failedStatus: string;
  now: Date;
  errorClass: string;
  errorMessage: string;
};

@Injectable()
export class StripeWebhookDeduplicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findStatus(eventId: string) {
    return this.prisma.stripeWebhookEventModel.findUnique({
      where: { eventId },
      select: { eventId: true, status: true },
    });
  }

  async tryCreateProcessingClaim(params: CreateProcessingClaimParams) {
    try {
      await this.prisma.stripeWebhookEventModel.create({
        data: {
          eventId: params.eventId,
          eventType: params.eventType,
          status: params.status,
          claimToken: params.claimToken,
          processingStartedAt: params.now,
          attemptCount: 1,
        },
      });
      return `created` as const;
    } catch (error) {
      if (this.isUniqueConflict(error)) {
        return `duplicate` as const;
      }
      throw error;
    }
  }

  async findProcessingState(eventId: string) {
    return this.prisma.stripeWebhookEventModel.findUnique({
      where: { eventId },
      select: {
        status: true,
        processingStartedAt: true,
      },
    });
  }

  async tryReclaimProcessingClaim(params: ReclaimProcessingClaimParams) {
    const reclaimResult = await this.prisma.stripeWebhookEventModel.updateMany({
      where: {
        eventId: params.eventId,
        OR: [
          { status: params.failedStatus },
          {
            status: params.status,
            processingStartedAt: { lte: params.staleCutoff },
          },
        ],
      },
      data: {
        eventType: params.eventType,
        status: params.status,
        claimToken: params.claimToken,
        processingStartedAt: params.now,
        failedAt: null,
        lastErrorClass: null,
        lastErrorMessage: null,
        attemptCount: { increment: 1 },
      },
    });

    return reclaimResult.count === 1;
  }

  async markProcessed(params: MarkProcessedParams) {
    await this.prisma.stripeWebhookEventModel.updateMany({
      where: {
        eventId: params.eventId,
        status: params.processingStatus,
        claimToken: params.claimToken,
      },
      data: {
        status: params.processedStatus,
        processedAt: params.now,
        failedAt: null,
        lastErrorClass: null,
        lastErrorMessage: null,
      },
    });
  }

  async markFailed(params: MarkFailedParams) {
    await this.prisma.stripeWebhookEventModel.updateMany({
      where: {
        eventId: params.eventId,
        status: params.processingStatus,
        claimToken: params.claimToken,
      },
      data: {
        status: params.failedStatus,
        failedAt: params.now,
        lastErrorClass: params.errorClass,
        lastErrorMessage: params.errorMessage,
      },
    });
  }

  async tryRecordProcessed(eventId: string, processedStatus: string, now: Date) {
    try {
      await this.prisma.stripeWebhookEventModel.create({
        data: {
          eventId,
          status: processedStatus,
          processedAt: now,
          attemptCount: 1,
        },
      });
      return `created` as const;
    } catch (error) {
      if (this.isUniqueConflict(error)) {
        return `duplicate` as const;
      }
      throw error;
    }
  }

  private isUniqueConflict(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === `P2002`;
  }
}
