import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import Stripe from 'stripe';

import { $Enums } from '@remoola/database-2';

import { createOutcomeIdempotent } from './ledger-outcome-idempotent';
import { envs } from '../../../envs';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class StripeReversalScheduler {
  private static readonly ADVISORY_LOCK_KEY = 227947120;
  private static readonly LOCK_TRANSACTION_TIMEOUT_MS = 120000;
  private static readonly MAX_STRIPE_IDS_PER_RUN = 50;
  private readonly logger = new Logger(StripeReversalScheduler.name);
  private stripe: Stripe;

  constructor(private readonly prisma: PrismaService) {
    this.stripe = new Stripe(envs.STRIPE_SECRET_KEY, { apiVersion: `2025-11-17.clover` });
  }

  private async selectPendingStripeIdsForRun(): Promise<
    { skipped: true } | { skipped: false; stripeIdsForRun: string[]; pendingStripeIds: number }
  > {
    return this.prisma.$transaction(
      async (tx) => {
        const lockRows = await tx.$queryRaw<{ locked: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(${StripeReversalScheduler.ADVISORY_LOCK_KEY}) AS "locked"
        `;
        if (lockRows[0]?.locked !== true) {
          this.logger.log({ event: `stripe_reversal_reconcile_skipped_lock_not_acquired` });
          return { skipped: true as const };
        }

        const pendingEntries = await tx.ledgerEntryModel.findMany({
          where: {
            type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
            status: $Enums.TransactionStatus.PENDING,
            stripeId: { not: null },
            createdBy: { not: `stripe` },
          },
          select: { stripeId: true },
        });

        const stripeIds = [...new Set(pendingEntries.map((entry) => entry.stripeId).filter(Boolean))] as string[];
        return {
          skipped: false as const,
          pendingStripeIds: stripeIds.length,
          stripeIdsForRun: stripeIds.slice(0, StripeReversalScheduler.MAX_STRIPE_IDS_PER_RUN),
        };
      },
      { timeout: StripeReversalScheduler.LOCK_TRANSACTION_TIMEOUT_MS },
    );
  }

  @Cron(`*/10 * * * *`)
  async reconcilePendingRefunds() {
    try {
      const selection = await this.selectPendingStripeIdsForRun();
      if (`stripeIdsForRun` in selection) {
        const { stripeIdsForRun, pendingStripeIds } = selection;
        let processed = 0;
        let failed = 0;

        for (const stripeId of stripeIdsForRun) {
          try {
            const refund = await this.stripe.refunds.retrieve(stripeId);
            const status =
              refund.status === `succeeded`
                ? $Enums.TransactionStatus.COMPLETED
                : refund.status === `failed` || refund.status === `canceled`
                  ? $Enums.TransactionStatus.DENIED
                  : $Enums.TransactionStatus.PENDING;
            const transitionExternalId = `reconcile:${stripeId}:${status}`;

            await this.prisma.$transaction(async (tx) => {
              const entries = await tx.ledgerEntryModel.findMany({
                where: { stripeId, type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL },
                select: { id: true },
              });
              for (const entry of entries) {
                await createOutcomeIdempotent(
                  tx,
                  {
                    ledgerEntryId: entry.id,
                    status,
                    source: `stripe-reconcile`,
                    externalId: transitionExternalId,
                  },
                  this.logger,
                );
              }
            });
            processed += 1;
          } catch (error: unknown) {
            failed += 1;
            const err = error as { message?: string };
            this.logger.warn({
              message: `Failed to reconcile refund`,
              stripeId,
              error: err?.message ?? String(error),
            });
          }
        }

        this.logger.log({
          event: `stripe_reversal_reconcile_complete`,
          pendingStripeIds,
          processedStripeIds: stripeIdsForRun.length,
          processed,
          failed,
        });
      }
    } catch (error: unknown) {
      this.logger.warn({
        event: `stripe_reversal_reconcile_failed`,
        errorClass: error instanceof Error ? error.name : `UnknownError`,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
