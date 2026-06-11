import { type AdminV2SystemSummaryCard } from '@remoola/api-types';

import { type EmailPatternRow } from './admin-v2-system.query';

type SystemSummaryCard = AdminV2SystemSummaryCard;

type BacklogSnapshot = {
  count: number;
  oldestAt: Date | null;
};

type RateSnapshot = {
  count: number;
  oldestReferenceAt: Date | null;
};

type LedgerAnomaliesSummary = {
  totalCount: number | null | undefined;
  classes: {
    stalePendingEntries: { count: number };
    inconsistentOutcomeChains: { count: number };
    largeValueOutliers: { count: number };
    orphanedEntries: { count: number };
    duplicateIdempotencyRisk: { count: number };
    impossibleTransitions: { count: number };
  };
};

export function buildStripeWebhookHealthCard(params: {
  checkoutLag: BacklogSnapshot;
  reversalLag: BacklogSnapshot;
  latestProcessedAt: Date | null;
}): SystemSummaryCard {
  const { checkoutLag, reversalLag, latestProcessedAt } = params;
  const totalLag = checkoutLag.count + reversalLag.count;
  const oldestLagAt = minDate(checkoutLag.oldestAt, reversalLag.oldestAt);

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
      { label: `Oldest lag marker`, value: formatIso(oldestLagAt) },
      { label: `Latest processed webhook`, value: formatIso(latestProcessedAt) },
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
}

export function buildSchedulerHealthCard(params: {
  overdueScheduledConversions: BacklogSnapshot;
  expiredResetPasswords: number;
  expiredOauthStates: number;
}): SystemSummaryCard {
  const { overdueScheduledConversions, expiredResetPasswords, expiredOauthStates } = params;
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
      { label: `Oldest delayed conversion`, value: formatIso(overdueScheduledConversions.oldestAt) },
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
}

export function buildEmailDeliveryIssuePatternsCard(params: {
  rows: EmailPatternRow[];
  windowStart: Date;
}): SystemSummaryCard {
  const { rows, windowStart } = params;
  const verificationFailures = sumActions(rows, [
    `verification_approve`,
    `verification_reject`,
    `verification_request_info`,
  ]);
  const adminLifecycleFailures = sumActions(rows, [`admin_invite`, `admin_password_reset`]);
  const totalFailures = rows.reduce((sum, row) => sum + row.count, 0);
  const lastFailedAt = rows.reduce<Date | null>((latest, row) => maxDate(latest, row.lastFailedAt), null);

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
      { label: `Last failed delivery marker`, value: formatIso(lastFailedAt) },
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
}

export function buildLedgerAnomaliesCard(summary: LedgerAnomaliesSummary): SystemSummaryCard {
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
    primaryAction: totalCount && totalCount > 0 ? { label: `Open ledger anomalies`, href: `/ledger/anomalies` } : null,
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
}

export function buildStaleExchangeRateAlertsCard(params: {
  rateSnapshot: RateSnapshot;
  staleThresholdHours: number;
}): SystemSummaryCard {
  const { rateSnapshot, staleThresholdHours } = params;

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
      { label: `Oldest stale reference`, value: formatIso(rateSnapshot.oldestReferenceAt) },
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
}

export function buildTemporarilyUnavailableCard(params: {
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

function sumActions(rows: EmailPatternRow[], actions: string[]) {
  const actionSet = new Set(actions);
  return rows.reduce((sum, row) => (actionSet.has(row.action) ? sum + row.count : sum), 0);
}

function formatIso(value: Date | null | undefined) {
  return value?.toISOString() ?? null;
}

function minDate(left: Date | null, right: Date | null) {
  if (!left) return right;
  if (!right) return left;
  return left.getTime() <= right.getTime() ? left : right;
}

function maxDate(left: Date | null, right: Date | null) {
  if (!left) return right;
  if (!right) return left;
  return left.getTime() >= right.getTime() ? left : right;
}
