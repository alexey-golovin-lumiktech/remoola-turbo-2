import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type * as AdminApi from '../../../lib/admin-api.server';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`../../../lib/admin-api.server`, () => ({
  getSystemSummary: jest.fn(),
}));

const { getSystemSummary: mockedGetSystemSummary } = jest.requireMock(`../../../lib/admin-api.server`) as jest.Mocked<
  typeof AdminApi
>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let SystemPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`admin-v2 system page`, () => {
  beforeAll(async () => {
    SystemPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetSystemSummary.mockReset();
    mockedGetSystemSummary.mockResolvedValue({
      computedAt: `2026-04-17T12:00:00.000Z`,
      cards: {
        stripeWebhookHealth: {
          label: `Stripe webhook health`,
          status: `watch`,
          explanation: `Stripe-backed settlement or reversal flows show ingestion lag.`,
          facts: [
            { label: `Pending checkout settlements`, value: 2 },
            { label: `Pending reversal reconciliations`, value: 1 },
          ],
          primaryAction: { label: `Open affected payments`, href: `/payments?status=WAITING` },
          escalationHint: `Escalate after domain triage if backlog keeps growing.`,
        },
        schedulerHealth: {
          label: `Scheduler health`,
          status: `healthy`,
          explanation: `No delayed exchange scheduling or auth cleanup backlog is currently visible.`,
          facts: [{ label: `Overdue scheduled conversions`, value: 0 }],
          primaryAction: null,
          escalationHint: `Escalate only when operators observe missed freshness without a queue explanation.`,
        },
        ledgerAnomalies: {
          label: `Ledger anomalies`,
          status: `watch`,
          explanation: `Read-only ledger anomaly detection shows active finance-review backlog.`,
          facts: [
            { label: `Total anomaly backlog`, value: 4 },
            { label: `Orphaned entries`, value: 1 },
            { label: `Duplicate idempotency risk`, value: 1 },
            { label: `Impossible transitions`, value: 1 },
          ],
          primaryAction: { label: `Open ledger anomalies`, href: `/ledger/anomalies` },
          escalationHint: `Escalate only when anomaly backlog keeps growing after ledger-domain triage identifies no safe operator action.`,
        },
        emailDeliveryIssuePatterns: {
          label: `Email delivery issue patterns`,
          status: `temporarily-unavailable`,
          explanation: `Recent admin-triggered email failure patterns could not be derived safely from audit metadata.`,
          facts: [],
          primaryAction: null,
          escalationHint: `Escalate mail delivery degradation if verification or admin recovery emails are visibly failing.`,
        },
        staleExchangeRateAlerts: {
          label: `Stale exchange rate alerts`,
          status: `watch`,
          explanation: `Approved exchange rates are stale beyond the configured freshness window.`,
          facts: [{ label: `Stale approved rates`, value: 3 }],
          primaryAction: { label: `Open stale exchange rates`, href: `/exchange/rates?stale=true` },
          escalationHint: `Escalate only if stale rates persist after Exchange review.`,
        },
      },
    });
  });

  it(`renders the five read-only maturity cards with drilldown links and escalation semantics`, async () => {
    const markup = renderToStaticMarkup(await SystemPage());

    expect(markup).toContain(`Read-only maturity surface for cross-domain product and background health`);
    expect(markup).toContain(`Stripe webhook health`);
    expect(markup).toContain(`Scheduler health`);
    expect(markup).toContain(`Ledger anomalies`);
    expect(markup).toContain(`Email delivery issue patterns`);
    expect(markup).toContain(`Stale exchange rate alerts`);
    expect(markup).toContain(`Status: Watch`);
    expect(markup).toContain(`Status: Healthy`);
    expect(markup).toContain(`Status: Temporarily unavailable`);
    expect(markup).toContain(`href="/payments?status=WAITING"`);
    expect(markup).toContain(`href="/ledger/anomalies"`);
    expect(markup).toContain(`href="/exchange/rates?stale=true"`);
    expect(markup).toContain(`Escalation: Escalate after domain triage if backlog keeps growing.`);
  });

  it(`shows a narrow fallback when the backend summary contract is unavailable`, async () => {
    mockedGetSystemSummary.mockResolvedValue(null);

    const markup = renderToStaticMarkup(await SystemPage());

    expect(markup).toContain(`Summary unavailable`);
    expect(markup).toContain(`Use existing domain workspaces for direct investigation.`);
  });
});
