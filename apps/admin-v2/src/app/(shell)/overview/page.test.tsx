import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type * as AdminApi from '../../../lib/admin-api.server';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`../../../lib/admin-api.server`, () => ({
  getAdminIdentity: jest.fn(),
  getOverviewSummary: jest.fn(),
  getQuickstarts: jest.fn(),
}));

jest.mock(`../../../lib/quickstart-investigations`, () => ({
  buildQuickstartHref: jest.fn(
    (targetPath: string, quickstartId: string) => `${targetPath}?quickstart=${quickstartId}`,
  ),
  describeQuickstartOperatorModel: jest.fn(() => `Fast entry`),
  filterQuickstartsForWorkspaces: jest.fn((quickstarts) => quickstarts),
  normalizeQuickstartEyebrow: jest.fn((value: string) => value),
}));

const { getAdminIdentity, getOverviewSummary, getQuickstarts } = jest.requireMock(
  `../../../lib/admin-api.server`,
) as jest.Mocked<typeof AdminApi>;

describe(`admin-v2 overview page`, () => {
  beforeEach(() => {
    getAdminIdentity.mockReset();
    getOverviewSummary.mockReset();
    getQuickstarts.mockReset();

    getAdminIdentity.mockResolvedValue({
      id: `admin-1`,
      email: `ops@example.com`,
      type: `ADMIN`,
      role: `OPS_ADMIN`,
      phase: `Selective operator platform`,
      accessMode: `schema-active`,
      featureMaturity: `selective-operator-platform`,
      capabilities: [`overview.read`],
      workspaces: [`overview`, `verification`, `payments`, `ledger`],
    } as never);
    getQuickstarts.mockResolvedValue([] as never);
  });

  it(`counts live workspaces from phaseStatus instead of availability`, async () => {
    getOverviewSummary.mockResolvedValue({
      computedAt: `2026-04-27T09:00:00.000Z`,
      signals: {
        pendingVerifications: {
          label: `Pending verifications`,
          count: 4,
          phaseStatus: `live-actionable`,
          availability: `available`,
          href: `/verification`,
          slaBreachedCount: 0,
        },
        recentAdminActions: {
          label: `Recent admin actions`,
          phaseStatus: `count-only`,
          availability: `available`,
          href: `/audit/admin-actions`,
          items: [],
        },
        suspiciousAuthEvents: {
          label: `Suspicious auth events`,
          count: 2,
          phaseStatus: `count-only`,
          availability: `available`,
          href: `/audit/auth`,
        },
        overduePaymentRequests: {
          label: `Overdue payment requests`,
          count: 1,
          phaseStatus: `live-actionable`,
          availability: `temporarily-unavailable`,
          href: `/payments?overdue=true`,
        },
        uncollectiblePaymentRequests: {
          label: `Uncollectible payment requests`,
          count: 0,
          phaseStatus: `count-only`,
          availability: `available`,
          href: `/payments?status=UNCOLLECTIBLE`,
        },
        openDisputes: {
          label: `Open disputes`,
          count: 3,
          phaseStatus: `live-actionable`,
          availability: `available`,
          href: `/ledger?view=disputes`,
        },
        ledgerAnomalies: {
          label: `Ledger anomalies`,
          count: 5,
          phaseStatus: `deferred`,
          availability: `available`,
          href: `/ledger/anomalies`,
        },
        failedScheduledConversions: {
          label: `Failed scheduled FX`,
          count: 1,
          phaseStatus: `count-only`,
          availability: `available`,
          href: `/exchange/scheduled?status=FAILED`,
        },
        staleExchangeRates: {
          label: `Stale exchange rates`,
          count: 6,
          phaseStatus: `count-only`,
          availability: `available`,
          href: `/exchange/rates?stale=true`,
        },
      },
    } as never);

    const OverviewPage = (await import(`./page`)).default;
    const markup = renderToStaticMarkup(await OverviewPage());

    expect(markup).toContain(`3 live workspaces`);
  });
});
