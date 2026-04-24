import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';

import type * as AdminApi from '../../../../lib/admin-api.server';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`../../../../lib/admin-api.server`, () => ({
  getAdminIdentity: jest.fn(),
  getLedgerAnomaliesSummary: jest.fn(),
  getLedgerAnomalies: jest.fn(),
  getSavedViews: jest.fn(),
}));

jest.mock(`../../../../lib/admin-mutations.server`, () => ({
  createSavedViewAction: jest.fn(async () => undefined),
  updateSavedViewAction: jest.fn(async () => undefined),
  deleteSavedViewAction: jest.fn(async () => undefined),
}));

const { getAdminIdentity, getLedgerAnomaliesSummary, getLedgerAnomalies, getSavedViews } = jest.requireMock(
  `../../../../lib/admin-api.server`,
) as jest.Mocked<typeof AdminApi>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let LedgerAnomaliesPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`admin-v2 ledger anomalies page`, () => {
  beforeAll(async () => {
    LedgerAnomaliesPage = await loadSubject();
  });

  beforeEach(() => {
    getAdminIdentity.mockReset();
    getLedgerAnomaliesSummary.mockReset();
    getLedgerAnomalies.mockReset();
    getSavedViews.mockReset();
    getAdminIdentity.mockResolvedValue({
      id: `admin-1`,
      email: `ops@example.com`,
      type: `ADMIN`,
      role: `OPS_ADMIN`,
      phase: `MVP-3`,
      capabilities: [`saved_views.manage`],
      workspaces: [`ledger`],
    } as never);
    getSavedViews.mockResolvedValue({ views: [] });

    getLedgerAnomaliesSummary.mockResolvedValue({
      computedAt: `2026-04-20T12:00:00.000Z`,
      totalCount: 6,
      classes: {
        stalePendingEntries: {
          label: `Stale pending entries`,
          count: 3,
          phaseStatus: `live-actionable`,
          availability: `available`,
          href: `/ledger/anomalies?class=stalePendingEntries`,
        },
        inconsistentOutcomeChains: {
          label: `Inconsistent outcome chains`,
          count: 2,
          phaseStatus: `live-actionable`,
          availability: `available`,
          href: `/ledger/anomalies?class=inconsistentOutcomeChains`,
        },
        largeValueOutliers: {
          label: `Large value outliers`,
          count: 1,
          phaseStatus: `live-actionable`,
          availability: `available`,
          href: `/ledger/anomalies?class=largeValueOutliers`,
        },
        orphanedEntries: {
          label: `Orphaned entries`,
          count: 4,
          phaseStatus: `live-actionable`,
          availability: `available`,
          href: `/ledger/anomalies?class=orphanedEntries`,
        },
        duplicateIdempotencyRisk: {
          label: `Duplicate idempotency risk`,
          count: 5,
          phaseStatus: `live-actionable`,
          availability: `available`,
          href: `/ledger/anomalies?class=duplicateIdempotencyRisk`,
        },
        impossibleTransitions: {
          label: `Impossible transitions`,
          count: 6,
          phaseStatus: `live-actionable`,
          availability: `available`,
          href: `/ledger/anomalies?class=impossibleTransitions`,
        },
      },
    });

    getLedgerAnomalies.mockResolvedValue({
      class: `stalePendingEntries`,
      nextCursor: `cursor-2`,
      computedAt: `2026-04-20T12:00:00.000Z`,
      items: [
        {
          id: `row-1`,
          ledgerEntryId: `entry-1`,
          consumerId: `consumer-1`,
          type: `USER_PAYMENT`,
          amount: `150.5`,
          currencyCode: `USD`,
          entryStatus: `PENDING`,
          outcomeStatus: `PROCESSING`,
          outcomeAt: `2026-04-18T10:00:00.000Z`,
          createdAt: `2026-04-18T09:00:00.000Z`,
          updatedAt: `2026-04-18T10:05:00.000Z`,
          signal: {
            class: `stalePendingEntries`,
            detail: `Latest outcome PROCESSING since 2026-04-18T10:00:00.000Z (48h ago, threshold 24h)`,
          },
        },
      ],
    });
  });

  it(`renders the narrow queue fallback when the anomaly list is unavailable`, async () => {
    getLedgerAnomalies.mockResolvedValue(null);

    await LedgerAnomaliesPage({
      searchParams: Promise.resolve({
        class: `largeValueOutliers`,
        dateFrom: `2026-04-10`,
      }),
    });

    expect(getLedgerAnomalies).toHaveBeenCalledWith({
      className: `largeValueOutliers`,
      dateFrom: `2026-04-10`,
      dateTo: expect.any(String),
      cursor: undefined,
      limit: 50,
    });
  });

  it(`hides saved-view mutation affordances when saved_views.manage is missing`, async () => {
    getAdminIdentity.mockResolvedValueOnce({
      id: `admin-2`,
      email: `readonly@example.com`,
      type: `ADMIN`,
      role: `OPS_ADMIN`,
      phase: `MVP-3`,
      capabilities: [`ledger.read`],
      workspaces: [`ledger`],
    } as never);

    await LedgerAnomaliesPage({
      searchParams: Promise.resolve({
        class: `stalePendingEntries`,
        dateFrom: `2026-04-10`,
        dateTo: `2026-04-20`,
      }),
    });

    expect(getSavedViews).not.toHaveBeenCalled();
  });
});
