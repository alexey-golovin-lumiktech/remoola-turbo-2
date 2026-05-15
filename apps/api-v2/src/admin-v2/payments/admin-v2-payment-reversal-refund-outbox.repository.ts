import { randomUUID } from 'crypto';

import { Injectable } from '@nestjs/common';

import { type NotificationOutboxModel, type Prisma } from '@remoola/database-2';

import {
  ADMIN_REFUND_FINALIZATION_OUTBOX_EVENT_TYPE,
  buildAdminRefundFinalizationOutboxRow,
  type AdminRefundFinalizationOutboxPayload,
} from './admin-v2-payment-reversal-refund-outbox';
import { PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { PrismaService } from '../../shared/prisma.service';

type NotificationOutboxClient = Pick<Prisma.TransactionClient, `notificationOutboxModel`>;

type ClaimedAdminRefundFinalizationOutboxRow = NotificationOutboxModel;

const RETRYABLE_OUTBOX_STATUSES = [`PENDING`, `FAILED`] as const;
const PROCESSING_STATUS = `PROCESSING`;
const SENT_STATUS = `SENT`;
const DEAD_STATUS = `DEAD`;
const MAX_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 60_000;
const PROCESSING_STALE_MS = 10 * 60 * 1000;

@Injectable()
export class AdminV2PaymentReversalRefundOutboxRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: PrismaTransactionRunner,
  ) {}

  private getRetryDelayMs(attempt: number) {
    return Math.min(60 * 60 * 1000, BASE_RETRY_DELAY_MS * 2 ** Math.max(0, attempt - 1));
  }

  private normalizeError(error: unknown) {
    return {
      errorClass: error instanceof Error ? error.name : `UnknownError`,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  queuePending(payload: AdminRefundFinalizationOutboxPayload, client?: NotificationOutboxClient) {
    const db = client ?? this.prisma;
    return db.notificationOutboxModel.createMany({
      data: [buildAdminRefundFinalizationOutboxRow(payload)],
      skipDuplicates: true,
    });
  }

  async claimDueRows(params?: { limit?: number; claimToken?: string; now?: Date }) {
    const claimToken = params?.claimToken ?? randomUUID();
    const now = params?.now ?? new Date();
    const staleProcessingBefore = new Date(now.getTime() - PROCESSING_STALE_MS);
    const limit = params?.limit ?? 25;

    return this.transactions.run(async (tx) => {
      const candidates = await tx.notificationOutboxModel.findMany({
        where: {
          eventType: ADMIN_REFUND_FINALIZATION_OUTBOX_EVENT_TYPE,
          OR: [
            { status: { in: [...RETRYABLE_OUTBOX_STATUSES] }, nextAttemptAt: { lte: now } },
            { status: PROCESSING_STATUS, processingStartedAt: { lt: staleProcessingBefore } },
          ],
        },
        orderBy: [{ nextAttemptAt: `asc` }, { createdAt: `asc` }],
        take: limit,
      });

      const claimed: ClaimedAdminRefundFinalizationOutboxRow[] = [];
      for (const candidate of candidates) {
        const result = await tx.notificationOutboxModel.updateMany({
          where: {
            id: candidate.id,
            eventType: ADMIN_REFUND_FINALIZATION_OUTBOX_EVENT_TYPE,
            OR: [
              { status: { in: [...RETRYABLE_OUTBOX_STATUSES] }, nextAttemptAt: { lte: now } },
              { status: PROCESSING_STATUS, processingStartedAt: { lt: staleProcessingBefore } },
            ],
          },
          data: {
            status: PROCESSING_STATUS,
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
            status: PROCESSING_STATUS,
            processingStartedAt: now,
            attemptCount: candidate.attemptCount + 1,
          });
        }
      }
      return claimed;
    });
  }

  markSent(row: ClaimedAdminRefundFinalizationOutboxRow, now = new Date()) {
    return this.prisma.notificationOutboxModel.updateMany({
      where: { id: row.id, claimToken: row.claimToken, status: PROCESSING_STATUS },
      data: { status: SENT_STATUS, sentAt: now, failedAt: null, claimToken: null, processingStartedAt: null },
    });
  }

  markSentByIdempotencyKey(idempotencyKey: string, now = new Date()) {
    return this.prisma.notificationOutboxModel.updateMany({
      where: { idempotencyKey },
      data: { status: SENT_STATUS, sentAt: now, failedAt: null, claimToken: null, processingStartedAt: null },
    });
  }

  markFailed(row: ClaimedAdminRefundFinalizationOutboxRow, error: unknown, now = new Date()) {
    const nextStatus = row.attemptCount >= MAX_ATTEMPTS ? DEAD_STATUS : `FAILED`;
    const { errorClass, errorMessage } = this.normalizeError(error);
    return this.prisma.notificationOutboxModel.updateMany({
      where: { id: row.id, claimToken: row.claimToken, status: PROCESSING_STATUS },
      data: {
        status: nextStatus,
        failedAt: now,
        nextAttemptAt: new Date(now.getTime() + this.getRetryDelayMs(row.attemptCount)),
        claimToken: null,
        processingStartedAt: null,
        lastErrorClass: errorClass,
        lastErrorMessage: errorMessage,
      },
    });
  }

  markFailedByIdempotencyKey(idempotencyKey: string, error: unknown, now = new Date()) {
    const { errorClass, errorMessage } = this.normalizeError(error);
    return this.prisma.notificationOutboxModel.updateMany({
      where: { idempotencyKey },
      data: {
        status: `FAILED`,
        failedAt: now,
        nextAttemptAt: new Date(now.getTime() + this.getRetryDelayMs(1)),
        claimToken: null,
        processingStartedAt: null,
        lastErrorClass: errorClass,
        lastErrorMessage: errorMessage,
      },
    });
  }

  markDeadByIdempotencyKey(idempotencyKey: string, error: unknown, now = new Date()) {
    const { errorClass, errorMessage } = this.normalizeError(error);
    return this.prisma.notificationOutboxModel.updateMany({
      where: { idempotencyKey },
      data: {
        status: DEAD_STATUS,
        failedAt: now,
        claimToken: null,
        processingStartedAt: null,
        lastErrorClass: errorClass,
        lastErrorMessage: errorMessage,
      },
    });
  }
}
