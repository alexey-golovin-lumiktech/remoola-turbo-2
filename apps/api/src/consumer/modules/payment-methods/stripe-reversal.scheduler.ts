import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import Stripe from 'stripe';

import { $Enums } from '@remoola/database-2';

import { envs } from '../../../envs';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class StripeReversalScheduler {
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

        await this.prisma.ledgerEntryModel.updateMany({
          where: { stripeId, type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL },
          data: { status, updatedBy: `stripe-reconcile` },
        });
      } catch (error) {
        console.error(`Failed to reconcile refund ${stripeId}:`, error);
      }
    }
  }
}
