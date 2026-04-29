import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import Stripe from 'stripe';

import { $Enums } from '@remoola/database-2';

import { StripeWebhookService } from './stripe-webhook.service';
import { PrismaService } from '../../../shared/prisma.service';
import { STRIPE_CLIENT } from '../../../shared/stripe-client';

@Injectable()
export class StripeCheckoutScheduler {
  private static readonly ADVISORY_LOCK_KEY = 227947121;
  private static readonly LOCK_TRANSACTION_TIMEOUT_MS = 120000;
  private static readonly MAX_SESSION_IDS_PER_RUN = 50;
  private readonly logger = new Logger(StripeCheckoutScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeWebhookService: StripeWebhookService,
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
  ) {}

  private getEffectiveStatus(entry: {
    status: $Enums.TransactionStatus;
    outcomes?: Array<{ status: $Enums.TransactionStatus }>;
  }): $Enums.TransactionStatus {
    return entry.outcomes?.[0]?.status ?? entry.status;
  }

  private async selectWaitingSessionIdsForRun(): Promise<
    { skipped: true } | { skipped: false; sessionIdsForRun: string[]; pendingSessionIds: number }
  > {
    return this.prisma.$transaction(
      async (tx) => {
        const lockRows = await tx.$queryRaw<{ locked: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(${StripeCheckoutScheduler.ADVISORY_LOCK_KEY}) AS "locked"
        `;
        if (lockRows[0]?.locked !== true) {
          this.logger.log({ event: `stripe_checkout_reconcile_skipped_lock_not_acquired` });
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
          sessionIdsForRun: sessionIds.slice(0, StripeCheckoutScheduler.MAX_SESSION_IDS_PER_RUN),
        };
      },
      { timeout: StripeCheckoutScheduler.LOCK_TRANSACTION_TIMEOUT_MS },
    );
  }

  @Cron(`* * * * *`)
  async reconcileWaitingCheckouts() {
    try {
      const selection = await this.selectWaitingSessionIdsForRun();
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
