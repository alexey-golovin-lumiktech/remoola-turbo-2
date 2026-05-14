import { Injectable } from '@nestjs/common';

import { type NotificationOutboxModel } from '@remoola/database-2';

import { PrismaService } from '../../../shared/prisma.service';

export type ClaimedReversalNotificationOutboxRow = NotificationOutboxModel;

type NotificationOutboxStatus = NotificationOutboxModel[`status`];

type ClaimDueRowsParams = {
  eventType: string;
  retryableStatuses: readonly NotificationOutboxStatus[];
  processingStatus: NotificationOutboxStatus;
  claimToken: string;
  now: Date;
  staleProcessingBefore: Date;
  limit: number;
};

type MarkSentParams = {
  row: ClaimedReversalNotificationOutboxRow;
  processingStatus: NotificationOutboxStatus;
  sentStatus: NotificationOutboxStatus;
  now: Date;
};

type MarkFailedParams = {
  row: ClaimedReversalNotificationOutboxRow;
  processingStatus: NotificationOutboxStatus;
  nextStatus: NotificationOutboxStatus;
  failedAt: Date;
  nextAttemptAt: Date;
  errorClass: string;
  errorMessage: string;
};

@Injectable()
export class StripeWebhookReversalNotificationOutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async claimDueRows(params: ClaimDueRowsParams): Promise<ClaimedReversalNotificationOutboxRow[]> {
    return this.prisma.$transaction(async (tx) => {
      const candidates = await tx.notificationOutboxModel.findMany({
        where: {
          eventType: params.eventType,
          OR: [
            {
              status: { in: [...params.retryableStatuses] },
              nextAttemptAt: { lte: params.now },
            },
            {
              status: params.processingStatus,
              processingStartedAt: { lt: params.staleProcessingBefore },
            },
          ],
        },
        orderBy: [{ nextAttemptAt: `asc` }, { createdAt: `asc` }],
        take: params.limit,
      });

      const claimed: ClaimedReversalNotificationOutboxRow[] = [];
      for (const candidate of candidates) {
        const result = await tx.notificationOutboxModel.updateMany({
          where: {
            id: candidate.id,
            eventType: params.eventType,
            OR: [
              {
                status: { in: [...params.retryableStatuses] },
                nextAttemptAt: { lte: params.now },
              },
              {
                status: params.processingStatus,
                processingStartedAt: { lt: params.staleProcessingBefore },
              },
            ],
          },
          data: {
            status: params.processingStatus,
            claimToken: params.claimToken,
            processingStartedAt: params.now,
            attemptCount: { increment: 1 },
            lastErrorClass: null,
            lastErrorMessage: null,
          },
        });
        if (result.count === 1) {
          claimed.push({
            ...candidate,
            claimToken: params.claimToken,
            status: params.processingStatus,
            processingStartedAt: params.now,
            attemptCount: candidate.attemptCount + 1,
          });
        }
      }
      return claimed;
    });
  }

  async markSent(params: MarkSentParams) {
    await this.prisma.notificationOutboxModel.updateMany({
      where: { id: params.row.id, claimToken: params.row.claimToken, status: params.processingStatus },
      data: {
        status: params.sentStatus,
        sentAt: params.now,
        failedAt: null,
        claimToken: null,
        processingStartedAt: null,
      },
    });
  }

  async markFailed(params: MarkFailedParams) {
    await this.prisma.notificationOutboxModel.updateMany({
      where: { id: params.row.id, claimToken: params.row.claimToken, status: params.processingStatus },
      data: {
        status: params.nextStatus,
        failedAt: params.failedAt,
        nextAttemptAt: params.nextAttemptAt,
        claimToken: null,
        processingStartedAt: null,
        lastErrorClass: params.errorClass,
        lastErrorMessage: params.errorMessage,
      },
    });
  }
}
