import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type * as AdminApi from '../../../../lib/admin-api.server';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`../../../../lib/admin-api.server`, () => ({
  getLedgerAnomaliesSummary: jest.fn(),
  getLedgerAnomalies: jest.fn(),
}));

const { getLedgerAnomaliesSummary, getLedgerAnomalies } = jest.requireMock(
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
    getLedgerAnomaliesSummary.mockReset();
    getLedgerAnomalies.mockReset();

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

  it(`renders summary cards for all six classes and the selected anomaly queue`, async () => {
    const markup = renderToStaticMarkup(
      await LedgerAnomaliesPage({
        searchParams: Promise.resolve({
          class: `stalePendingEntries`,
          dateFrom: `2026-04-10`,
          dateTo: `2026-04-20`,
        }),
      }),
    );

    expect(markup).toContain(`Ledger anomalies`);
    expect(markup).toContain(`Stale pending entries`);
    expect(markup).toContain(`Inconsistent outcome chains`);
    expect(markup).toContain(`Large value outliers`);
    expect(markup).toContain(`Orphaned entries`);
    expect(markup).toContain(`Duplicate idempotency risk`);
    expect(markup).toContain(`Impossible transitions`);
    expect(markup).toContain(`Latest outcome PROCESSING since 2026-04-18T10:00:00.000Z`);
    expect(markup).toContain(`href="/ledger/entry-1"`);
    expect(markup).toContain(`href="/consumers/consumer-1"`);
    expect(markup).toContain(
      `href="/ledger/anomalies?class=stalePendingEntries&amp;dateFrom=2026-04-10&amp;dateTo=2026-04-20&amp;cursor=cursor-2"`,
    );
    expect(getLedgerAnomalies).toHaveBeenCalledWith({
      className: `stalePendingEntries`,
      dateFrom: `2026-04-10`,
      dateTo: `2026-04-20`,
      cursor: undefined,
      limit: 50,
    });
  });

  it(`renders the orphaned entries class from search params`, async () => {
    getLedgerAnomalies.mockResolvedValue({
      class: `orphanedEntries`,
      nextCursor: null,
      computedAt: `2026-04-20T12:00:00.000Z`,
      items: [],
    });

    const markup = renderToStaticMarkup(
      await LedgerAnomaliesPage({
        searchParams: Promise.resolve({
          class: `orphanedEntries`,
          dateFrom: `2026-04-10`,
          dateTo: `2026-04-20`,
        }),
      }),
    );

    expect(markup).toContain(`Orphaned entries`);
    expect(markup).toContain(`No anomalies found for the selected class and time window.`);
    expect(getLedgerAnomalies).toHaveBeenCalledWith(
      expect.objectContaining({
        className: `orphanedEntries`,
      }),
    );
  });

  it(`renders the duplicate idempotency risk class from search params`, async () => {
    getLedgerAnomalies.mockResolvedValue({
      class: `duplicateIdempotencyRisk`,
      nextCursor: null,
      computedAt: `2026-04-20T12:00:00.000Z`,
      items: [],
    });

    const markup = renderToStaticMarkup(
      await LedgerAnomaliesPage({
        searchParams: Promise.resolve({
          class: `duplicateIdempotencyRisk`,
          dateFrom: `2026-04-10`,
          dateTo: `2026-04-20`,
        }),
      }),
    );

    expect(markup).toContain(`Duplicate idempotency risk`);
    expect(getLedgerAnomalies).toHaveBeenCalledWith(
      expect.objectContaining({
        className: `duplicateIdempotencyRisk`,
      }),
    );
  });

  it(`renders the impossible transitions class from search params`, async () => {
    getLedgerAnomalies.mockResolvedValue({
      class: `impossibleTransitions`,
      nextCursor: null,
      computedAt: `2026-04-20T12:00:00.000Z`,
      items: [],
    });

    const markup = renderToStaticMarkup(
      await LedgerAnomaliesPage({
        searchParams: Promise.resolve({
          class: `impossibleTransitions`,
          dateFrom: `2026-04-10`,
          dateTo: `2026-04-20`,
        }),
      }),
    );

    expect(markup).toContain(`Impossible transitions`);
    expect(getLedgerAnomalies).toHaveBeenCalledWith(
      expect.objectContaining({
        className: `impossibleTransitions`,
      }),
    );
  });

  it(`shows a narrow fallback when the queue fetch is unavailable`, async () => {
    getLedgerAnomalies.mockResolvedValue(null);

    const markup = renderToStaticMarkup(
      await LedgerAnomaliesPage({
        searchParams: Promise.resolve({
          class: `largeValueOutliers`,
          dateFrom: `2026-04-10`,
        }),
      }),
    );

    expect(markup).toContain(`Queue unavailable from the backend read contract.`);
    expect(markup).toContain(`Ledger anomaly queue is temporarily unavailable.`);
  });

  it(`renders a temporarily-unavailable message for a new class`, async () => {
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
          count: null,
          phaseStatus: `live-actionable`,
          availability: `temporarily-unavailable`,
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
      class: `orphanedEntries`,
      nextCursor: null,
      computedAt: `2026-04-20T12:00:00.000Z`,
      items: [],
    });

    const markup = renderToStaticMarkup(
      await LedgerAnomaliesPage({
        searchParams: Promise.resolve({
          class: `orphanedEntries`,
          dateFrom: `2026-04-10`,
          dateTo: `2026-04-20`,
        }),
      }),
    );

    expect(markup).toContain(`This anomaly class is temporarily unavailable right now.`);
  });
});
