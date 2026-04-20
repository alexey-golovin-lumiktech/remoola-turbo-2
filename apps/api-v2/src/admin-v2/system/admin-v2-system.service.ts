import { Injectable } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { envs } from '../../envs';
import { PrismaService } from '../../shared/prisma.service';
import { AdminV2LedgerAnomaliesService } from '../ledger/anomalies/admin-v2-ledger-anomalies.service';

type SystemCardStatus = `healthy` | `watch` | `temporarily-unavailable`;

type SystemSummaryFact = {
  label: string;
  value: string | number | null;
};

type SystemSummaryAction = {
  label: string;
  href: string;
} | null;

type SystemSummaryCard = {
  label: string;
  status: SystemCardStatus;
  explanation: string;
  facts: SystemSummaryFact[];
  primaryAction: SystemSummaryAction;
  escalationHint: string | null;
};

type BacklogSnapshot = {
  count: number;
  oldestAt: Date | null;
};

type EmailPatternRow = {
  action: string;
  count: number;
  lastFailedAt: Date | null;
};

type RateSnapshot = {
  count: number;
  oldestReferenceAt: Date | null;
};

type SystemSummaryResponse = {
  computedAt: string;
  cards: {
    stripeWebhookHealth: SystemSummaryCard;
    schedulerHealth: SystemSummaryCard;
    ledgerAnomalies: SystemSummaryCard;
    emailDeliveryIssuePatterns: SystemSummaryCard;
    staleExchangeRateAlerts: SystemSummaryCard;
  };
};

const EMAIL_WINDOW_DAYS = 7;

@Injectable()
export class AdminV2SystemService {
  constructor(
    private readonly prisma: PrismaService,
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
      const [checkoutLag, reversalLag, latestProcessed] = await Promise.all([
        this.getStripeCheckoutLag(),
        this.getStripeReversalLag(),
        this.prisma.stripeWebhookEventModel.aggregate({
          _max: { createdAt: true },
        }),
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
          { label: `Latest processed webhook`, value: this.formatIso(latestProcessed._max.createdAt) },
        ],
        primaryAction:
          checkoutLag.count > 0
            ? { label: `Open affected payments`, href: `/payments?status=WAITING` }
            : reversalLag.count > 0
              ? { label: `Open pending ledger reversals`, href: `/ledger?status=PENDING` }
              : null,
        escalationHint:
          totalLag > 0
            ? `If backlog keeps growing after domain triage, escalate as Stripe event-ingestion degradation.`
            : `Escalate only if operators report Stripe-backed payment drift without a visible queue backlog.`,
      };
    } catch {
      return this.temporarilyUnavailableCard({
        label: `Stripe webhook health`,
        explanation: [
          `Product-facing Stripe ingestion health could not be derived safely from the current backend state.`,
        ].join(` `),
        escalationHint: `Escalate platform degradation if Stripe-backed payment or reversal flows are visibly delayed.`,
      });
    }
  }

  private async getSchedulerHealth(now: Date): Promise<SystemSummaryCard> {
    try {
      const [overdueScheduledConversions, expiredResetPasswords, expiredOauthStates] = await Promise.all([
        this.getOverdueScheduledConversions(now),
        this.prisma.resetPasswordModel.count({
          where: {
            deletedAt: null,
            expiredAt: { lt: now },
          },
        }),
        this.prisma.oauthStateModel.count({
          where: {
            expiresAt: { lt: now },
          },
        }),
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
              ` from DB-backed background surfaces.`,
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
            : `Escalate only when operators observe missed background freshness` +
              ` without a visible domain queue explanation.`,
      };
    } catch {
      return this.temporarilyUnavailableCard({
        label: `Scheduler health`,
        explanation: [
          `Background freshness across scheduler-backed product surfaces could not be derived safely right now.`,
        ].join(` `),
        escalationHint: `Escalate if exchange scheduling or auth recovery cleanup appears stale in operator workflows.`,
      });
    }
  }

  private async getEmailDeliveryIssuePatterns(now: Date): Promise<SystemSummaryCard> {
    const windowStart = new Date(now.getTime() - EMAIL_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    try {
      const rows = await this.prisma.$queryRaw<EmailPatternRow[]>(Prisma.sql`
        SELECT
          log.action AS "action",
          COUNT(*)::int AS "count",
          MAX(log.created_at) AS "lastFailedAt"
        FROM admin_action_audit_log AS log
        WHERE log.created_at >= ${windowStart}
          AND COALESCE(log.metadata->>'notificationType', '') = 'email'
          AND COALESCE(log.metadata->>'notificationSent', 'false') = 'false'
        GROUP BY log.action
        ORDER BY COUNT(*) DESC, MAX(log.created_at) DESC
      `);

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
              ` no failed delivery pattern in the audit trail window.`,
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
            : `Escalate only when operators report missing admin-triggered emails outside the current audit window.`,
      };
    } catch {
      return this.temporarilyUnavailableCard({
        label: `Email delivery issue patterns`,
        explanation: `Recent admin-triggered email failure patterns could not be derived safely from audit metadata.`,
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
            ? `Read-only ledger anomaly detection shows active finance-review backlog.` +
              ` Use the dedicated queue for case triage instead of treating System as a replacement workspace.`
            : totalCount === 0
              ? `No current stale pending entries, inconsistent outcome chains, large value outliers, orphaned entries, duplicate idempotency risk, or impossible transitions are visible.`
              : `Ledger anomaly health could not be derived safely from the read-only queue summary.`,
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
                `after ledger-domain triage identifies no safe operator action.`,
              ].join(` `)
            : totalCount === 0
              ? [
                  `Escalate only if operators observe ledger integrity drift`,
                  `without an anomaly backlog signal.`,
                ].join(` `)
              : [
                  `Use the Ledger workspace directly and escalate`,
                  `if anomaly review is blocked by missing queue visibility.`,
                ].join(` `),
      };
    } catch {
      return this.temporarilyUnavailableCard({
        label: `Ledger anomalies`,
        explanation: `Ledger anomaly health could not be derived safely from the read-only queue summary.`,
        escalationHint: [
          `Use the Ledger workspace directly and escalate`,
          `if anomaly review is blocked by missing queue visibility.`,
        ].join(` `),
      });
    }
  }

  private async getStaleExchangeRateAlerts(now: Date): Promise<SystemSummaryCard> {
    try {
      const rateSnapshot = await this.getStaleRateSnapshot(now);
      const staleThresholdHours = this.getRateMaxAgeHours();

      return {
        label: `Stale exchange rate alerts`,
        status: rateSnapshot.count > 0 ? `watch` : `healthy`,
        explanation:
          rateSnapshot.count > 0
            ? `Approved exchange rates are stale beyond the configured freshness window.` +
              ` Use Exchange for exact rate investigation instead of treating System as an FX console.`
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
            : `Escalate only if operators observe FX freshness issues without a stale-rate alert.`,
      };
    } catch {
      return this.temporarilyUnavailableCard({
        label: `Stale exchange rate alerts`,
        explanation: `Exchange rate freshness could not be derived safely from the approved-rate surface.`,
        escalationHint: `Use the Exchange workspace and escalate if stale-rate investigation is blocked.`,
      });
    }
  }

  private async getStripeCheckoutLag(): Promise<BacklogSnapshot> {
    const [result] = await this.prisma.$queryRaw<Array<{ count: number; oldestAt: Date | null }>>(Prisma.sql`
      SELECT
        COUNT(*)::int AS "count",
        MIN(entry.created_at) AS "oldestAt"
      FROM ledger_entry AS entry
      LEFT JOIN LATERAL (
        SELECT outcome.status, outcome.source, outcome.external_id
        FROM ledger_entry_outcome AS outcome
        WHERE outcome.ledger_entry_id = entry.id
        ORDER BY outcome.created_at DESC, outcome.id DESC
        LIMIT 1
      ) AS latest ON TRUE
      WHERE entry.deleted_at IS NULL
        AND entry.type::text = 'USER_PAYMENT'
        AND COALESCE(latest.status::text, entry.status::text) = 'WAITING'
        AND latest.source = 'stripe'
        AND latest.external_id LIKE 'cs\_%' ESCAPE '\'
    `);

    return {
      count: result?.count ?? 0,
      oldestAt: result?.oldestAt ?? null,
    };
  }

  private async getStripeReversalLag(): Promise<BacklogSnapshot> {
    const [result] = await this.prisma.$queryRaw<Array<{ count: number; oldestAt: Date | null }>>(Prisma.sql`
      SELECT
        COUNT(*)::int AS "count",
        MIN(entry.created_at) AS "oldestAt"
      FROM ledger_entry AS entry
      LEFT JOIN LATERAL (
        SELECT outcome.status
        FROM ledger_entry_outcome AS outcome
        WHERE outcome.ledger_entry_id = entry.id
        ORDER BY outcome.created_at DESC, outcome.id DESC
        LIMIT 1
      ) AS latest ON TRUE
      WHERE entry.deleted_at IS NULL
        AND entry.type::text IN ('USER_PAYMENT_REVERSAL', 'USER_DEPOSIT_REVERSAL')
        AND entry.stripe_id IS NOT NULL
        AND entry.created_by <> 'stripe'
        AND COALESCE(latest.status::text, entry.status::text) = 'PENDING'
    `);

    return {
      count: result?.count ?? 0,
      oldestAt: result?.oldestAt ?? null,
    };
  }

  private async getOverdueScheduledConversions(now: Date): Promise<BacklogSnapshot> {
    const [result] = await this.prisma.$queryRaw<Array<{ count: number; oldestAt: Date | null }>>(Prisma.sql`
      SELECT
        COUNT(*)::int AS "count",
        MIN(conversion.execute_at) AS "oldestAt"
      FROM scheduled_fx_conversion AS conversion
      WHERE conversion.deleted_at IS NULL
        AND conversion.status::text = 'PENDING'
        AND conversion.execute_at < ${now}
    `);

    return {
      count: result?.count ?? 0,
      oldestAt: result?.oldestAt ?? null,
    };
  }

  private async getStaleRateSnapshot(now: Date): Promise<RateSnapshot> {
    const staleCutoff = this.getRateStaleCutoff(now);
    const [result] = await this.prisma.$queryRaw<Array<{ count: number; oldestReferenceAt: Date | null }>>(Prisma.sql`
      SELECT
        COUNT(*)::int AS "count",
        MIN(COALESCE(rate.fetched_at, rate.effective_at, rate.created_at)) AS "oldestReferenceAt"
      FROM exchange_rate AS rate
      WHERE rate.deleted_at IS NULL
        AND rate.status::text = 'APPROVED'
        AND rate.effective_at <= ${now}
        AND (rate.expires_at IS NULL OR rate.expires_at > ${now})
        AND COALESCE(rate.fetched_at, rate.effective_at, rate.created_at) < ${staleCutoff}
    `);

    return {
      count: result?.count ?? 0,
      oldestReferenceAt: result?.oldestReferenceAt ?? null,
    };
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
