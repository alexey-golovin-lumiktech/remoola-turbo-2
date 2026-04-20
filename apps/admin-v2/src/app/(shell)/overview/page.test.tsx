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
  getOverviewSummary: jest.fn(),
}));

const { getOverviewSummary: mockedGetOverviewSummary } = jest.requireMock(
  `../../../lib/admin-api.server`,
) as jest.Mocked<typeof AdminApi>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let OverviewPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`admin-v2 overview page`, () => {
  beforeAll(async () => {
    OverviewPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetOverviewSummary.mockReset();
    mockedGetOverviewSummary.mockResolvedValue({
      computedAt: `2026-04-17T12:00:00.000Z`,
      signals: {
        pendingVerifications: {
          label: `Pending verifications`,
          count: 4,
          phaseStatus: `live-actionable`,
          availability: `available`,
          href: `/verification`,
        },
        recentAdminActions: {
          label: `Recent admin actions`,
          phaseStatus: `live-actionable`,
          availability: `available`,
          href: `/audit/admin-actions`,
          items: [],
        },
        suspiciousAuthEvents: {
          label: `Suspicious auth events`,
          count: 1,
          phaseStatus: `live-actionable`,
          availability: `available`,
          href: `/audit/auth`,
        },
        overduePaymentRequests: {
          label: `Overdue payment requests`,
          count: 2,
          phaseStatus: `live-actionable`,
          availability: `available`,
          href: `/payments?overdue=true`,
        },
        uncollectiblePaymentRequests: {
          label: `Uncollectible payment requests`,
          count: 3,
          phaseStatus: `live-actionable`,
          availability: `available`,
          href: `/payments?status=UNCOLLECTIBLE`,
        },
        openDisputes: {
          label: `Open disputes`,
          count: 5,
          phaseStatus: `live-actionable`,
          availability: `available`,
          href: `/ledger?view=disputes`,
        },
        ledgerAnomalies: {
          label: `Ledger anomalies`,
          count: 6,
          phaseStatus: `live-actionable`,
          availability: `available`,
          href: `/ledger/anomalies`,
        },
        failedScheduledConversions: {
          label: `Failed scheduled FX`,
          count: 7,
          phaseStatus: `live-actionable`,
          availability: `available`,
          href: `/exchange/scheduled?status=FAILED`,
        },
        staleExchangeRates: {
          label: `Stale exchange rates`,
          count: 8,
          phaseStatus: `live-actionable`,
          availability: `available`,
          href: `/exchange/rates?stale=true`,
        },
      },
    });
  });

  it(`keeps exchange signals in a separate overview section while preserving canonical phase vocabulary`, async () => {
    const markup = renderToStaticMarkup(await OverviewPage());

    expect(markup).toContain(`active core pressure separated from exchange follow-up signals`);
    expect(markup).toContain(`Exchange follow-up`);
    expect(markup).toContain(`Open exchange surface`);
    expect(markup).toContain(`live-actionable`);
    expect(markup).toContain(`Ledger anomalies`);
    expect(markup).toContain(`href="/ledger/anomalies"`);
    expect(markup).toContain(`href="/exchange/scheduled?status=FAILED"`);
    expect(markup).toContain(`href="/exchange/rates?stale=true"`);
  });
});
