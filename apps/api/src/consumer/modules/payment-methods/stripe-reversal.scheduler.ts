import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import Stripe from 'stripe';

import { $Enums } from '@remoola/database-2';

import { createOutcomeIdempotent } from './ledger-outcome-idempotent';
import { envs } from '../../../envs';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class StripeReversalScheduler {
  private readonly logger = new Logger(StripeReversalScheduler.name);
  private stripe: Stripe;

  constructor(private readonly prisma: PrismaService) {
    this.stripe = new Stripe(envs.STRIPE_SECRET_KEY, { apiVersion: `2025-11-17.clover` });
  }

  @Cron(`*/10 * * * *`)
  async reconcilePendingRefunds() {
    const pendingEntries = await this.prisma.ledgerEntryModel.findMany({
      where: {
        type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
        status: $Enums.TransactionStatus.PENDING,
        stripeId: { not: null },
        createdBy: { not: `stripe` },
      },
      select: { stripeId: true },
    });

    const stripeIds = [...new Set(pendingEntries.map((entry) => entry.stripeId).filter(Boolean))] as string[];

    for (const stripeId of stripeIds) {
      try {
        const refund = await this.stripe.refunds.retrieve(stripeId);
        const status =
          refund.status === `succeeded`
            ? $Enums.TransactionStatus.COMPLETED
            : refund.status === `failed`
              ? $Enums.TransactionStatus.DENIED
              : $Enums.TransactionStatus.PENDING;

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
                externalId: stripeId,
              },
              this.logger,
            );
          }
        });
      } catch (error: unknown) {
        const err = error as { message?: string };
        this.logger.warn({
          message: `Failed to reconcile refund`,
          stripeId,
          error: err?.message ?? String(error),
        });
      }
    }
  }
}
