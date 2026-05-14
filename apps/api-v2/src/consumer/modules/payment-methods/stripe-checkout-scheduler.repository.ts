import { Injectable } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { PrismaService } from '../../../shared/prisma.service';

export type CheckoutSchedulerSelection =
  | { skipped: true }
  | { skipped: false; sessionIdsForRun: string[]; pendingSessionIds: number };

@Injectable()
export class StripeCheckoutSchedulerRepository {
  private static readonly ADVISORY_LOCK_KEY = 227947121;
  private static readonly LOCK_TRANSACTION_TIMEOUT_MS = 120000;
  private static readonly MAX_SESSION_IDS_PER_RUN = 50;

  constructor(private readonly prisma: PrismaService) {}

  async selectWaitingSessionIdsForRun(): Promise<CheckoutSchedulerSelection> {
    return this.prisma.$transaction(
      async (tx) => {
        const lockRows = await tx.$queryRaw<{ locked: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(${StripeCheckoutSchedulerRepository.ADVISORY_LOCK_KEY}) AS "locked"
        `;
        if (lockRows[0]?.locked !== true) {
          return { skipped: true as const };
        }

        const waitingEntries = await tx.ledgerEntryModel.findMany({
          where: {
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            paymentRequestId: { not: null },
          },
          select: {
            status: true,
            outcomes: {
              orderBy: { createdAt: `desc` },
              take: 1,
              select: { status: true, source: true, externalId: true },
            },
          },
        });

        const sessionIds = [
          ...new Set(
            waitingEntries
              .filter((entry) => this.getEffectiveStatus(entry) === $Enums.TransactionStatus.WAITING)
              .map((entry) => entry.outcomes?.[0])
              .filter(
                (
                  outcome,
                ): outcome is {
                  status: $Enums.TransactionStatus;
                  source: string | null;
                  externalId: string | null;
                } =>
                  outcome?.source === `stripe` &&
                  typeof outcome.externalId === `string` &&
                  outcome.externalId.startsWith(`cs_`),
              )
              .map((outcome) => outcome.externalId),
          ),
        ];

        return {
          skipped: false as const,
          pendingSessionIds: sessionIds.length,
          sessionIdsForRun: sessionIds.slice(0, StripeCheckoutSchedulerRepository.MAX_SESSION_IDS_PER_RUN),
        };
      },
      { timeout: StripeCheckoutSchedulerRepository.LOCK_TRANSACTION_TIMEOUT_MS },
    );
  }

  private getEffectiveStatus(entry: {
    status: $Enums.TransactionStatus;
    outcomes?: Array<{ status: $Enums.TransactionStatus }>;
  }): $Enums.TransactionStatus {
    return entry.outcomes?.[0]?.status ?? entry.status;
  }
}
