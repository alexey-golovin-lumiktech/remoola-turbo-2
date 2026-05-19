import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import Stripe from 'stripe';

import { StripeCheckoutSchedulerRepository } from './stripe-checkout-scheduler.repository';
import { StripeWebhookService } from './stripe-webhook.service';
import { SCHEDULER_CRON } from '../../../shared/scheduler-policy';
import { STRIPE_CLIENT } from '../../../shared/stripe-client';

@Injectable()
export class StripeCheckoutScheduler {
  private readonly logger = new Logger(StripeCheckoutScheduler.name);

  constructor(
    private readonly checkoutSchedulerRepository: StripeCheckoutSchedulerRepository,
    private readonly stripeWebhookService: StripeWebhookService,
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
  ) {}

  @Cron(SCHEDULER_CRON.stripeCheckoutReconcile)
  async reconcileWaitingCheckouts() {
    try {
      const selection = await this.checkoutSchedulerRepository.selectWaitingSessionIdsForRun();
      if (selection.skipped) {
        this.logger.log({ event: `stripe_checkout_reconcile_skipped_lock_not_acquired` });
        return;
      }

      if (`sessionIdsForRun` in selection) {
        const { sessionIdsForRun, pendingSessionIds } = selection;
        let processed = 0;
        let failed = 0;

        for (const sessionId of sessionIdsForRun) {
          try {
            const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
              expand: [`payment_intent`],
            });

            if (session.payment_status !== `paid`) {
              continue;
            }

            await this.stripeWebhookService.finalizeCheckoutSessionSuccess(session);
            processed += 1;
          } catch (error: unknown) {
            failed += 1;
            const err = error as { message?: string };
            this.logger.warn({
              message: `Failed to reconcile checkout session`,
              sessionId,
              error: err?.message ?? String(error),
            });
          }
        }

        this.logger.log({
          event: `stripe_checkout_reconcile_complete`,
          pendingSessionIds,
          processedSessionIds: sessionIdsForRun.length,
          processed,
          failed,
        });
      }
    } catch (error: unknown) {
      this.logger.warn({
        event: `stripe_checkout_reconcile_failed`,
        errorClass: error instanceof Error ? error.name : `UnknownError`,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
