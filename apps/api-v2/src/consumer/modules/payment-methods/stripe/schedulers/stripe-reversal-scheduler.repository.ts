import { Injectable, type Logger } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { PrismaService } from '../../../../../shared/prisma.service';
import { createOutcomeIdempotent } from '../core/ledger-outcome-idempotent';

type ReversalSchedulerSelection =
  | { skipped: true }
  | { skipped: false; stripeIdsForRun: string[]; pendingStripeIds: number };

@Injectable()
export class StripeReversalSchedulerRepository {
  private static readonly ADVISORY_LOCK_KEY = 227947120;
  private static readonly LOCK_TRANSACTION_TIMEOUT_MS = 120000;
  private static readonly MAX_STRIPE_IDS_PER_RUN = 50;
  private static readonly PAYMENT_REQUEST_REVERSAL_ENTRY_TYPES = [
    $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
    $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL,
  ] as const;

  constructor(private readonly prisma: PrismaService) {}

  async selectPendingStripeIdsForRun(): Promise<ReversalSchedulerSelection> {
    return this.prisma.$transaction(
      async (tx) => {
        const lockRows = await tx.$queryRaw<{ locked: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(${StripeReversalSchedulerRepository.ADVISORY_LOCK_KEY}) AS "locked"
        `;
        if (lockRows[0]?.locked !== true) {
          return { skipped: true as const };
        }

        const pendingEntries = await tx.ledgerEntryModel.findMany({
          where: {
            type: { in: [...StripeReversalSchedulerRepository.PAYMENT_REQUEST_REVERSAL_ENTRY_TYPES] },
            stripeId: { not: null },
            createdBy: { not: `stripe` },
          },
          select: {
            stripeId: true,
            status: true,
            outcomes: {
              orderBy: { createdAt: `desc` },
              take: 1,
              select: { status: true },
            },
          },
        });

        const stripeIds = [
          ...new Set(
            pendingEntries
              .filter((entry) => this.getEffectiveStatus(entry) === $Enums.TransactionStatus.PENDING)
              .map((entry) => entry.stripeId)
              .filter(Boolean),
          ),
        ] as string[];

        return {
          skipped: false as const,
          pendingStripeIds: stripeIds.length,
          stripeIdsForRun: stripeIds.slice(0, StripeReversalSchedulerRepository.MAX_STRIPE_IDS_PER_RUN),
        };
      },
      { timeout: StripeReversalSchedulerRepository.LOCK_TRANSACTION_TIMEOUT_MS },
    );
  }

  async recordRefundOutcome(params: {
    stripeId: string;
    status: $Enums.TransactionStatus;
    externalId: string;
    logger: Logger;
  }) {
    await this.prisma.$transaction(async (tx) => {
      const entries = await tx.ledgerEntryModel.findMany({
        where: {
          stripeId: params.stripeId,
          type: { in: [...StripeReversalSchedulerRepository.PAYMENT_REQUEST_REVERSAL_ENTRY_TYPES] },
        },
        select: { id: true },
      });
      for (const entry of entries) {
        await createOutcomeIdempotent(
          tx,
          {
            ledgerEntryId: entry.id,
            status: params.status,
            source: `stripe-reconcile`,
            externalId: params.externalId,
          },
          params.logger,
        );
      }
    });
  }

  private getEffectiveStatus(entry: {
    status: $Enums.TransactionStatus;
    outcomes?: Array<{ status: $Enums.TransactionStatus }>;
  }): $Enums.TransactionStatus {
    return entry.outcomes?.[0]?.status ?? entry.status;
  }
}
