import { Injectable } from '@nestjs/common';

import { type AdminV2SystemSummaryCard, type AdminV2SystemSummaryResponse } from '@remoola/api-types';

import { type EmailPatternRow, AdminV2SystemQuery } from './admin-v2-system.query';
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

      const totalLag = checkoutLag.count + reversalLag.count;
      const oldestLagAt = this.minDate(checkoutLag.oldestAt, reversalLag.oldestAt);

      return {
        label: `Stripe webhook health`,
        status: totalLag > 0 ? `watch` : `healthy`,
        explanation:
          totalLag > 0
            ? `Stripe-backed settlement or reversal flows show ingestion lag.` +
              ` Open the affected payment or ledger queue before escalating a broader delivery issue.`
            : `No Stripe-backed settlement or reversal backlog is currently visible from product-facing flows.`,
        facts: [
          { label: `Pending checkout settlements`, value: checkoutLag.count },
          { label: `Pending reversal reconciliations`, value: reversalLag.count },
          { label: `Oldest lag marker`, value: this.formatIso(oldestLagAt) },
          { label: `Latest processed webhook`, value: this.formatIso(latestProcessedAt) },
        ],
        primaryAction:
          checkoutLag.count > 0
            ? { label: `Open affected payments`, href: `/payments?status=WAITING` }
            : reversalLag.count > 0
              ? { label: `Open pending ledger reversals`, href: `/ledger?status=PENDING` }
              : null,
        escalationHint:
          totalLag > 0
            ? `If backlog keeps growing after payment or ledger review, escalate as Stripe event-ingestion degradation.`
            : `Escalate only if Stripe-backed payment drift is reported without a visible payment or ledger backlog.`,
      };
    } catch {
      return this.temporarilyUnavailableCard({
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

      const totalBacklog = overdueScheduledConversions.count + expiredResetPasswords + expiredOauthStates;

      return {
        label: `Scheduler health`,
        status: totalBacklog > 0 ? `watch` : `healthy`,
        explanation:
          totalBacklog > 0
            ? `Background freshness shows delayed work in exchange scheduling or auth cleanup families.` +
              ` Handle the exchange queue directly, and escalate auth cleanup drift if it persists.`
            : `No delayed exchange scheduling or auth cleanup backlog is currently visible` +
              ` in the available background data.`,
        facts: [
          { label: `Overdue scheduled conversions`, value: overdueScheduledConversions.count },
          { label: `Expired reset-password rows`, value: expiredResetPasswords },
          { label: `Expired OAuth state rows`, value: expiredOauthStates },
          { label: `Oldest delayed conversion`, value: this.formatIso(overdueScheduledConversions.oldestAt) },
        ],
        primaryAction:
          overdueScheduledConversions.count > 0
            ? { label: `Open scheduled conversions`, href: `/exchange/scheduled?status=PENDING` }
            : null,
        escalationHint:
          totalBacklog > 0
            ? `Escalate platform degradation if auth cleanup backlog remains non-zero` +
              ` or scheduled conversions keep missing their execute window.`
            : `Escalate only when delayed background processing is reported` + ` without a visible related queue.`,
      };
    } catch {
      return this.temporarilyUnavailableCard({
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

      const verificationFailures = this.sumActions(rows, [
        `verification_approve`,
        `verification_reject`,
        `verification_request_info`,
      ]);
      const adminLifecycleFailures = this.sumActions(rows, [`admin_invite`, `admin_password_reset`]);
      const totalFailures = rows.reduce((sum, row) => sum + row.count, 0);
      const lastFailedAt = rows.reduce<Date | null>((latest, row) => this.maxDate(latest, row.lastFailedAt), null);

      return {
        label: `Email delivery issue patterns`,
        status: totalFailures > 0 ? `watch` : `healthy`,
        explanation:
          totalFailures > 0
            ? `Recent admin-triggered email flows show failed delivery handoff patterns.` +
              ` Review audit traces first, then escalate broader mail degradation only if failures cluster.`
            : `Recent admin-triggered verification and admin lifecycle emails show` +
              ` no failed delivery pattern in the current audit window.`,
        facts: [
          { label: `Failed deliveries in last 7d`, value: totalFailures },
          { label: `Verification email failures`, value: verificationFailures },
          { label: `Admin auth email failures`, value: adminLifecycleFailures },
          { label: `Last failed delivery marker`, value: this.formatIso(lastFailedAt) },
        ],
        primaryAction:
          totalFailures > 0
            ? {
                label: `Open recent admin action audit`,
                href: `/audit/admin-actions?dateFrom=${encodeURIComponent(windowStart.toISOString())}`,
              }
            : null,
        escalationHint:
          totalFailures > 0
            ? `If failures repeat across verification and admin password/invite flows,` +
              ` escalate mail delivery degradation instead of retrying silently.`
            : `Escalate only when missing admin-triggered emails are reported outside the current audit window.`,
      };
    } catch {
      return this.temporarilyUnavailableCard({
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
      const stalePendingEntries = summary.classes.stalePendingEntries.count;
      const inconsistentOutcomeChains = summary.classes.inconsistentOutcomeChains.count;
      const largeValueOutliers = summary.classes.largeValueOutliers.count;
      const orphanedEntries = summary.classes.orphanedEntries.count;
      const duplicateIdempotencyRisk = summary.classes.duplicateIdempotencyRisk.count;
      const impossibleTransitions = summary.classes.impossibleTransitions.count;
      const totalCount = summary.totalCount;

      return {
        label: `Ledger anomalies`,
        status: totalCount && totalCount > 0 ? `watch` : totalCount === 0 ? `healthy` : `temporarily-unavailable`,
        explanation:
          totalCount && totalCount > 0
            ? `Read-only ledger anomaly detection shows an active review backlog.` +
              ` Use the dedicated queue for detailed investigation.`
            : totalCount === 0
              ? `No current stale pending entries, inconsistent outcome chains, large value outliers,` +
                ` orphaned entries, duplicate idempotency risk, or impossible transitions are visible.`
              : `Ledger anomaly health is temporarily unavailable from the read-only queue summary.`,
        facts: [
          { label: `Total anomaly backlog`, value: totalCount },
          { label: `Stale pending entries`, value: stalePendingEntries },
          { label: `Inconsistent outcome chains`, value: inconsistentOutcomeChains },
          { label: `Large value outliers`, value: largeValueOutliers },
          { label: `Orphaned entries`, value: orphanedEntries },
          { label: `Duplicate idempotency risk`, value: duplicateIdempotencyRisk },
          { label: `Impossible transitions`, value: impossibleTransitions },
        ],
        primaryAction:
          totalCount && totalCount > 0 ? { label: `Open ledger anomalies`, href: `/ledger/anomalies` } : null,
        escalationHint:
          totalCount && totalCount > 0
            ? [
                `Escalate only when anomaly backlog keeps growing`,
                `after ledger review identifies no safe next step.`,
              ].join(` `)
            : totalCount === 0
              ? [`Escalate only if ledger integrity drift is reported`, `without an anomaly backlog signal.`].join(` `)
              : [
                  `Use the Ledger workspace directly and escalate`,
                  `if anomaly review is blocked by missing queue visibility.`,
                ].join(` `),
      };
    } catch {
      return this.temporarilyUnavailableCard({
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

      return {
        label: `Stale exchange rate alerts`,
        status: rateSnapshot.count > 0 ? `watch` : `healthy`,
        explanation:
          rateSnapshot.count > 0
            ? `Approved exchange rates are stale beyond the configured freshness window.` +
              ` Use Exchange for rate details instead of relying on System for full FX investigation.`
            : `No approved exchange rates currently breach the configured freshness window.`,
        facts: [
          { label: `Stale approved rates`, value: rateSnapshot.count },
          { label: `Oldest stale reference`, value: this.formatIso(rateSnapshot.oldestReferenceAt) },
          { label: `Configured freshness window (hours)`, value: staleThresholdHours },
        ],
        primaryAction:
          rateSnapshot.count > 0 ? { label: `Open stale exchange rates`, href: `/exchange/rates?stale=true` } : null,
        escalationHint:
          rateSnapshot.count > 0
            ? `Escalate platform degradation only if stale rates persist` +
              ` after Exchange review confirms no safe active rate path.`
            : `Escalate only if FX freshness issues are reported without a stale-rate alert.`,
      };
    } catch {
      return this.temporarilyUnavailableCard({
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

  private sumActions(rows: EmailPatternRow[], actions: string[]) {
    const actionSet = new Set(actions);
    return rows.reduce((sum, row) => (actionSet.has(row.action) ? sum + row.count : sum), 0);
  }

  private formatIso(value: Date | null | undefined) {
    return value?.toISOString() ?? null;
  }

  private minDate(left: Date | null, right: Date | null) {
    if (!left) return right;
    if (!right) return left;
    return left.getTime() <= right.getTime() ? left : right;
  }

  private maxDate(left: Date | null, right: Date | null) {
    if (!left) return right;
    if (!right) return left;
    return left.getTime() >= right.getTime() ? left : right;
  }

  private temporarilyUnavailableCard(params: {
    label: string;
    explanation: string;
    escalationHint: string;
  }): SystemSummaryCard {
    return {
      label: params.label,
      status: `temporarily-unavailable`,
      explanation: params.explanation,
      facts: [],
      primaryAction: null,
      escalationHint: params.escalationHint,
    };
  }
}
