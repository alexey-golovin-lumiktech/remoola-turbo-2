import { describe, expect, it } from '@jest/globals';

import {
  buildEmailDeliveryIssuePatternsCard,
  buildLedgerAnomaliesCard,
  buildSchedulerHealthCard,
  buildStaleExchangeRateAlertsCard,
  buildStripeWebhookHealthCard,
  buildTemporarilyUnavailableCard,
} from './admin-v2-system-summary.helpers';

describe(`admin-v2-system-summary.helpers`, () => {
  it(`builds stripe webhook health with checkout queue action priority and oldest marker`, () => {
    const card = buildStripeWebhookHealthCard({
      checkoutLag: {
        count: 2,
        oldestAt: new Date(`2026-04-17T09:00:00.000Z`),
      },
      reversalLag: {
        count: 1,
        oldestAt: new Date(`2026-04-17T10:00:00.000Z`),
      },
      latestProcessedAt: new Date(`2026-04-17T11:55:00.000Z`),
    });

    expect(card.status).toBe(`watch`);
    expect(card.primaryAction).toEqual({
      label: `Open affected payments`,
      href: `/payments?status=WAITING`,
    });
    expect(card.facts).toEqual([
      { label: `Pending checkout settlements`, value: 2 },
      { label: `Pending reversal reconciliations`, value: 1 },
      { label: `Oldest lag marker`, value: `2026-04-17T09:00:00.000Z` },
      { label: `Latest processed webhook`, value: `2026-04-17T11:55:00.000Z` },
    ]);
  });

  it(`builds scheduler health from combined backlog`, () => {
    const card = buildSchedulerHealthCard({
      overdueScheduledConversions: {
        count: 3,
        oldestAt: new Date(`2026-04-17T08:00:00.000Z`),
      },
      expiredResetPasswords: 2,
      expiredOauthStates: 1,
    });

    expect(card.status).toBe(`watch`);
    expect(card.primaryAction).toEqual({
      label: `Open scheduled conversions`,
      href: `/exchange/scheduled?status=PENDING`,
    });
    expect(card.facts).toEqual([
      { label: `Overdue scheduled conversions`, value: 3 },
      { label: `Expired reset-password rows`, value: 2 },
      { label: `Expired OAuth state rows`, value: 1 },
      { label: `Oldest delayed conversion`, value: `2026-04-17T08:00:00.000Z` },
    ]);
  });

  it(`builds email delivery issue patterns with verification and admin lifecycle buckets`, () => {
    const card = buildEmailDeliveryIssuePatternsCard({
      windowStart: new Date(`2026-04-10T12:00:00.000Z`),
      rows: [
        { action: `verification_approve`, count: 2, lastFailedAt: new Date(`2026-04-17T09:00:00.000Z`) },
        { action: `admin_invite`, count: 1, lastFailedAt: new Date(`2026-04-17T10:00:00.000Z`) },
        { action: `unrelated_action`, count: 5, lastFailedAt: new Date(`2026-04-17T08:00:00.000Z`) },
      ],
    });

    expect(card.status).toBe(`watch`);
    expect(card.primaryAction).toEqual({
      label: `Open recent admin action audit`,
      href: `/audit/admin-actions?dateFrom=2026-04-10T12%3A00%3A00.000Z`,
    });
    expect(card.facts).toEqual([
      { label: `Failed deliveries in last 7d`, value: 8 },
      { label: `Verification email failures`, value: 2 },
      { label: `Admin auth email failures`, value: 1 },
      { label: `Last failed delivery marker`, value: `2026-04-17T10:00:00.000Z` },
    ]);
  });

  it(`builds ledger anomalies card for backlog and zero-count states`, () => {
    const watchCard = buildLedgerAnomaliesCard({
      totalCount: 4,
      classes: {
        stalePendingEntries: { count: 2 },
        inconsistentOutcomeChains: { count: 1 },
        largeValueOutliers: { count: 1 },
        orphanedEntries: { count: 3 },
        duplicateIdempotencyRisk: { count: 4 },
        impossibleTransitions: { count: 5 },
      },
    });
    const healthyCard = buildLedgerAnomaliesCard({
      totalCount: 0,
      classes: {
        stalePendingEntries: { count: 0 },
        inconsistentOutcomeChains: { count: 0 },
        largeValueOutliers: { count: 0 },
        orphanedEntries: { count: 0 },
        duplicateIdempotencyRisk: { count: 0 },
        impossibleTransitions: { count: 0 },
      },
    });

    expect(watchCard.status).toBe(`watch`);
    expect(watchCard.primaryAction).toEqual({
      label: `Open ledger anomalies`,
      href: `/ledger/anomalies`,
    });
    expect(healthyCard.status).toBe(`healthy`);
    expect(healthyCard.primaryAction).toBeNull();
  });

  it(`builds stale exchange rate alerts with configured hours fact`, () => {
    const card = buildStaleExchangeRateAlertsCard({
      rateSnapshot: {
        count: 4,
        oldestReferenceAt: new Date(`2026-04-15T09:00:00.000Z`),
      },
      staleThresholdHours: 24,
    });

    expect(card.status).toBe(`watch`);
    expect(card.primaryAction).toEqual({
      label: `Open stale exchange rates`,
      href: `/exchange/rates?stale=true`,
    });
    expect(card.facts).toEqual([
      { label: `Stale approved rates`, value: 4 },
      { label: `Oldest stale reference`, value: `2026-04-15T09:00:00.000Z` },
      { label: `Configured freshness window (hours)`, value: 24 },
    ]);
  });

  it(`builds temporarily unavailable cards with empty facts and null action`, () => {
    expect(
      buildTemporarilyUnavailableCard({
        label: `Scheduler health`,
        explanation: `unavailable`,
        escalationHint: `Escalate`,
      }),
    ).toEqual({
      label: `Scheduler health`,
      status: `temporarily-unavailable`,
      explanation: `unavailable`,
      facts: [],
      primaryAction: null,
      escalationHint: `Escalate`,
    });
  });
});
