import { Injectable } from '@nestjs/common';

import { type AdminV2SystemSummaryCard, type AdminV2SystemSummaryResponse } from '@remoola/api-types';

import {
  buildEmailDeliveryIssuePatternsCard,
  buildLedgerAnomaliesCard,
  buildSchedulerHealthCard,
  buildStaleExchangeRateAlertsCard,
  buildStripeWebhookHealthCard,
  buildTemporarilyUnavailableCard,
} from './admin-v2-system-summary.helpers';
import { AdminV2SystemQuery } from './admin-v2-system.query';
import { envs } from '../../envs';
import { AdminV2LedgerAnomaliesService } from '../ledger/anomalies/admin-v2-ledger-anomalies.service';

type SystemSummaryCard = AdminV2SystemSummaryCard;

type SystemSummaryResponse = AdminV2SystemSummaryResponse;

const EMAIL_WINDOW_DAYS = 7;

@Injectable()
export class AdminV2SystemService {
  constructor(
    private readonly query: AdminV2SystemQuery,
    private readonly ledgerAnomalies: AdminV2LedgerAnomaliesService,
  ) {}

  async getSummary(): Promise<SystemSummaryResponse> {
    const now = new Date();
    const [stripeWebhookHealth, schedulerHealth, ledgerAnomalies, emailDeliveryIssuePatterns, staleExchangeRateAlerts] =
      await Promise.all([
        this.getStripeWebhookHealth(),
        this.getSchedulerHealth(now),
        this.getLedgerAnomaliesCard(),
        this.getEmailDeliveryIssuePatterns(now),
        this.getStaleExchangeRateAlerts(now),
      ]);

    return {
      computedAt: now.toISOString(),
      cards: {
        stripeWebhookHealth,
        schedulerHealth,
        ledgerAnomalies,
        emailDeliveryIssuePatterns,
        staleExchangeRateAlerts,
      },
    };
  }

  private async getStripeWebhookHealth(): Promise<SystemSummaryCard> {
    try {
      const [checkoutLag, reversalLag, latestProcessedAt] = await Promise.all([
        this.query.getStripeCheckoutLag(),
        this.query.getStripeReversalLag(),
        this.query.getLatestProcessedWebhookAt(),
      ]);

      return buildStripeWebhookHealthCard({
        checkoutLag,
        reversalLag,
        latestProcessedAt,
      });
    } catch {
      return buildTemporarilyUnavailableCard({
        label: `Stripe webhook health`,
        explanation: [
          `Product-facing Stripe ingestion health is temporarily unavailable from the current service data.`,
        ].join(` `),
        escalationHint: `Escalate platform degradation if Stripe-backed payment or reversal flows are visibly delayed.`,
      });
    }
  }

  private async getSchedulerHealth(now: Date): Promise<SystemSummaryCard> {
    try {
      const [overdueScheduledConversions, expiredResetPasswords, expiredOauthStates] = await Promise.all([
        this.query.getOverdueScheduledConversions(now),
        this.query.countExpiredResetPasswords(now),
        this.query.countExpiredOauthStates(now),
      ]);

      return buildSchedulerHealthCard({
        overdueScheduledConversions,
        expiredResetPasswords,
        expiredOauthStates,
      });
    } catch {
      return buildTemporarilyUnavailableCard({
        label: `Scheduler health`,
        explanation: [
          `Background freshness across scheduler-backed product surfaces is temporarily unavailable right now.`,
        ].join(` `),
        escalationHint: [
          `Escalate if exchange scheduling or auth recovery cleanup appears delayed in the related workflows.`,
        ].join(` `),
      });
    }
  }

  private async getEmailDeliveryIssuePatterns(now: Date): Promise<SystemSummaryCard> {
    const windowStart = new Date(now.getTime() - EMAIL_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    try {
      const rows = await this.query.listEmailDeliveryIssuePatterns(windowStart);

      return buildEmailDeliveryIssuePatternsCard({
        rows,
        windowStart,
      });
    } catch {
      return buildTemporarilyUnavailableCard({
        label: `Email delivery issue patterns`,
        explanation: `Recent admin-triggered email failure patterns are temporarily unavailable from audit metadata.`,
        escalationHint: [
          `Escalate mail delivery degradation if verification or admin recovery emails are visibly failing.`,
        ].join(` `),
      });
    }
  }

  private async getLedgerAnomaliesCard(): Promise<SystemSummaryCard> {
    try {
      const summary = await this.ledgerAnomalies.getSummary();
      return buildLedgerAnomaliesCard(summary);
    } catch {
      return buildTemporarilyUnavailableCard({
        label: `Ledger anomalies`,
        explanation: `Ledger anomaly health is temporarily unavailable from the read-only queue summary.`,
        escalationHint: [
          `Use the Ledger workspace directly and escalate`,
          `if anomaly review is blocked by missing queue visibility.`,
        ].join(` `),
      });
    }
  }

  private async getStaleExchangeRateAlerts(now: Date): Promise<SystemSummaryCard> {
    try {
      const rateSnapshot = await this.query.getStaleRateSnapshot({
        now,
        staleCutoff: this.getRateStaleCutoff(now),
      });
      const staleThresholdHours = this.getRateMaxAgeHours();

      return buildStaleExchangeRateAlertsCard({
        rateSnapshot,
        staleThresholdHours,
      });
    } catch {
      return buildTemporarilyUnavailableCard({
        label: `Stale exchange rate alerts`,
        explanation: `Exchange rate freshness is temporarily unavailable from the approved-rate surface.`,
        escalationHint: `Use the Exchange workspace and escalate if stale-rate investigation is blocked.`,
      });
    }
  }

  private getRateMaxAgeHours() {
    return Number.isFinite(envs.EXCHANGE_RATE_MAX_AGE_HOURS) && envs.EXCHANGE_RATE_MAX_AGE_HOURS > 0
      ? envs.EXCHANGE_RATE_MAX_AGE_HOURS
      : 24;
  }

  private getRateStaleCutoff(now: Date) {
    return new Date(now.getTime() - this.getRateMaxAgeHours() * 60 * 60 * 1000);
  }
}
