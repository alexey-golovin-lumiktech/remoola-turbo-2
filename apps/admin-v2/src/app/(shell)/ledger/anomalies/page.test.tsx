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

function expectDisabledLink(markup: string, href: string): void {
  const htmlHref = href.replaceAll(`&`, `&amp;`);
  const escapedHref = htmlHref.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`);
  expect(markup).toMatch(
    new RegExp(
      `<a[^>]*(href="${escapedHref}"[^>]*aria-disabled="true"|aria-disabled="true"[^>]*href="${escapedHref}")`,
    ),
  );
}

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

  it(`maps the orphaned entries search params into the anomaly query`, async () => {
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

    expect(getLedgerAnomalies).toHaveBeenCalledWith({
      className: `orphanedEntries`,
      dateFrom: `2026-04-10`,
      dateTo: `2026-04-20`,
      cursor: undefined,
      limit: 50,
    });
    expect(markup).toContain(`aria-current="page"`);
  });

  it(`maps the duplicate idempotency risk search params into the anomaly query`, async () => {
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

    expect(getLedgerAnomalies).toHaveBeenCalledWith({
      className: `duplicateIdempotencyRisk`,
      dateFrom: `2026-04-10`,
      dateTo: `2026-04-20`,
      cursor: undefined,
      limit: 50,
    });
    expect(markup).toContain(
      `/ledger/anomalies?class=duplicateIdempotencyRisk&amp;dateFrom=2026-04-10&amp;dateTo=2026-04-20`,
    );
  });

  it(`maps the impossible transitions search params into the anomaly query`, async () => {
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

    expect(getLedgerAnomalies).toHaveBeenCalledWith({
      className: `impossibleTransitions`,
      dateFrom: `2026-04-10`,
      dateTo: `2026-04-20`,
      cursor: undefined,
      limit: 50,
    });
    expect(markup).toContain(
      `/ledger/anomalies?class=impossibleTransitions&amp;dateFrom=2026-04-10&amp;dateTo=2026-04-20`,
    );
  });

  it(`renders the narrow queue fallback when the anomaly list is unavailable`, async () => {
    getLedgerAnomalies.mockResolvedValue(null);

    const markup = renderToStaticMarkup(
      await LedgerAnomaliesPage({
        searchParams: Promise.resolve({
          class: `largeValueOutliers`,
          dateFrom: `2026-04-10`,
        }),
      }),
    );

    expect(getLedgerAnomalies).toHaveBeenCalledWith({
      className: `largeValueOutliers`,
      dateFrom: `2026-04-10`,
      dateTo: expect.any(String),
      cursor: undefined,
      limit: 50,
    });
    expect(markup).toContain(`Ledger anomaly queue is temporarily unavailable.`);
  });

  it(`adds the class-unavailable warning only when the selected class is marked unavailable`, async () => {
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

    expect(getLedgerAnomalies).toHaveBeenCalledWith({
      className: `orphanedEntries`,
      dateFrom: `2026-04-10`,
      dateTo: `2026-04-20`,
      cursor: undefined,
      limit: 50,
    });
    expect(markup).toContain(`This anomaly class is temporarily unavailable right now.`);
  });

  it(`maps valid saved views into apply links and falls back for invalid payloads`, async () => {
    getSavedViews.mockResolvedValue({
      views: [
        {
          id: `view-1`,
          workspace: `ledger_anomalies`,
          name: `Stale 7d`,
          description: `Stale entries last week`,
          queryPayload: { class: `stalePendingEntries`, dateFrom: `2026-04-13`, dateTo: `2026-04-20` },
          createdAt: `2026-04-19T10:00:00.000Z`,
          updatedAt: `2026-04-19T10:00:00.000Z`,
        },
        {
          id: `view-2`,
          workspace: `ledger_anomalies`,
          name: `Outliers month`,
          description: null,
          queryPayload: { class: `largeValueOutliers`, dateFrom: `2026-04-01`, dateTo: `2026-04-30` },
          createdAt: `2026-04-19T11:00:00.000Z`,
          updatedAt: `2026-04-19T11:00:00.000Z`,
        },
        {
          id: `view-3`,
          workspace: `ledger_anomalies`,
          name: `Legacy shape`,
          description: null,
          queryPayload: { foo: `bar` },
          createdAt: `2026-04-19T12:00:00.000Z`,
          updatedAt: `2026-04-19T12:00:00.000Z`,
        },
      ],
    });

    const markup = renderToStaticMarkup(
      await LedgerAnomaliesPage({
        searchParams: Promise.resolve({
          class: `stalePendingEntries`,
          dateFrom: `2026-04-10`,
          dateTo: `2026-04-20`,
        }),
      }),
    );

    expect(getSavedViews).toHaveBeenCalledWith({ workspace: `ledger_anomalies` });
    expect(markup).toContain(
      `href="/ledger/anomalies?class=stalePendingEntries&amp;dateFrom=2026-04-13&amp;dateTo=2026-04-20"`,
    );
    expect(markup).toContain(
      `href="/ledger/anomalies?class=largeValueOutliers&amp;dateFrom=2026-04-01&amp;dateTo=2026-04-30"`,
    );
    expect(markup).toContain(`Saved view payload could not be applied.`);
    expectDisabledLink(markup, `/ledger/anomalies?class=stalePendingEntries&dateFrom=2026-04-10&dateTo=2026-04-20`);
  });

  it(`falls back to an empty saved-view list when the saved views fetch returns null`, async () => {
    getSavedViews.mockResolvedValue(null);

    const markup = renderToStaticMarkup(
      await LedgerAnomaliesPage({
        searchParams: Promise.resolve({
          class: `stalePendingEntries`,
          dateFrom: `2026-04-10`,
          dateTo: `2026-04-20`,
        }),
      }),
    );

    expect(getSavedViews).toHaveBeenCalledWith({ workspace: `ledger_anomalies` });
    expect(markup).toContain(`name="workspace" value="ledger_anomalies"`);
    expect(markup).toContain(
      `name="queryPayload" value="{&quot;class&quot;:&quot;stalePendingEntries&quot;,&quot;dateFrom&quot;:&quot;2026-04-10&quot;,&quot;dateTo&quot;:&quot;2026-04-20&quot;}"`,
    );
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

    const markup = renderToStaticMarkup(
      await LedgerAnomaliesPage({
        searchParams: Promise.resolve({
          class: `stalePendingEntries`,
          dateFrom: `2026-04-10`,
          dateTo: `2026-04-20`,
        }),
      }),
    );

    expect(getSavedViews).not.toHaveBeenCalled();
    expect(markup).toContain(`Saved view management is not available for this admin identity.`);
    expect(markup).not.toContain(`name="workspace" value="ledger_anomalies"`);
  });
});
