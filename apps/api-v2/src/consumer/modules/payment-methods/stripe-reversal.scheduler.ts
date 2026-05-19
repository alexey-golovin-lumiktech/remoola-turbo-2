import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import Stripe from 'stripe';

import { $Enums } from '@remoola/database-2';

import { StripeReversalSchedulerRepository } from './stripe-reversal-scheduler.repository';
import { SCHEDULER_CRON } from '../../../shared/scheduler-policy';
import { STRIPE_CLIENT } from '../../../shared/stripe-client';

@Injectable()
export class StripeReversalScheduler {
  private readonly logger = new Logger(StripeReversalScheduler.name);

  constructor(
    private readonly reversalSchedulerRepository: StripeReversalSchedulerRepository,
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
  ) {}

  @Cron(SCHEDULER_CRON.stripeReversalReconcile)
  async reconcilePendingRefunds() {
    try {
      const selection = await this.reversalSchedulerRepository.selectPendingStripeIdsForRun();
      if (selection.skipped) {
        this.logger.log({ event: `stripe_reversal_reconcile_skipped_lock_not_acquired` });
        return;
      }

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

            await this.reversalSchedulerRepository.recordRefundOutcome({
              stripeId,
              status,
              externalId: transitionExternalId,
              logger: this.logger,
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
