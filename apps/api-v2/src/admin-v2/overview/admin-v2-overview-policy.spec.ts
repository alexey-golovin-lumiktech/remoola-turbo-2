import { describe, expect, it } from '@jest/globals';

import {
  buildAvailableCountSignal,
  buildLedgerAnomaliesSignal,
  buildPendingVerificationsSignal,
  buildRateStaleCutoff,
  buildRecentAdminActionsSignal,
  buildSuspiciousAuthEventsSignal,
  buildUnavailableCountSignal,
  buildUnavailableLedgerAnomaliesSignal,
  mapRecentAdminActionItem,
} from './admin-v2-overview-policy';

describe(`AdminV2OverviewPolicy`, () => {
  it(`builds available and unavailable count signals without changing shape`, () => {
    expect(
      buildAvailableCountSignal({
        label: `Open disputes`,
        href: `/ledger?view=disputes`,
        count: 4,
      }),
    ).toEqual({
      label: `Open disputes`,
      count: 4,
      phaseStatus: `live-actionable`,
      availability: `available`,
      href: `/ledger?view=disputes`,
    });

    expect(
      buildUnavailableCountSignal({
        label: `Open disputes`,
        href: `/ledger?view=disputes`,
      }),
    ).toEqual({
      label: `Open disputes`,
      count: null,
      phaseStatus: `live-actionable`,
      availability: `temporarily-unavailable`,
      href: `/ledger?view=disputes`,
    });
  });

  it(`builds ledger anomalies signal availability from totalCount`, () => {
    expect(buildLedgerAnomaliesSignal(6)).toEqual({
      label: `Ledger anomalies`,
      count: 6,
      phaseStatus: `live-actionable`,
      availability: `available`,
      href: `/ledger/anomalies`,
    });
    expect(buildLedgerAnomaliesSignal(null)).toEqual({
      label: `Ledger anomalies`,
      count: null,
      phaseStatus: `live-actionable`,
      availability: `temporarily-unavailable`,
      href: `/ledger/anomalies`,
    });
    expect(buildUnavailableLedgerAnomaliesSignal()).toEqual({
      label: `Ledger anomalies`,
      count: null,
      phaseStatus: `live-actionable`,
      availability: `temporarily-unavailable`,
      href: `/ledger/anomalies`,
    });
  });

  it(`builds pending verifications and suspicious auth signals with stable metadata`, () => {
    expect(
      buildPendingVerificationsSignal({
        count: 28,
        slaBreachedCount: 1,
      }),
    ).toEqual({
      label: `Pending verifications`,
      count: 28,
      phaseStatus: `live-actionable`,
      availability: `available`,
      href: `/verification`,
      slaBreachedCount: 1,
    });

    expect(
      buildSuspiciousAuthEventsSignal({
        count: 5,
        authWindowStart: new Date(`2026-04-14T10:05:00.000Z`),
      }),
    ).toEqual({
      label: `Suspicious auth events`,
      count: 5,
      phaseStatus: `live-actionable`,
      availability: `available`,
      href: `/audit/auth?event=login_failure&dateFrom=2026-04-14T10:05:00.000Z`,
    });
  });

  it(`maps recent admin actions with iso timestamps`, () => {
    const row = {
      id: `audit-1`,
      action: `verification_approve`,
      resource: `consumer`,
      resourceId: `consumer-1`,
      createdAt: new Date(`2026-04-15T10:00:00.000Z`),
      admin: { email: `admin@example.com` },
    };

    expect(mapRecentAdminActionItem(row)).toEqual({
      id: `audit-1`,
      action: `verification_approve`,
      resource: `consumer`,
      resourceId: `consumer-1`,
      adminEmail: `admin@example.com`,
      createdAt: `2026-04-15T10:00:00.000Z`,
    });

    expect(buildRecentAdminActionsSignal([row])).toEqual({
      label: `Recent admin actions`,
      phaseStatus: `live-actionable`,
      availability: `available`,
      href: `/audit/admin-actions`,
      items: [
        {
          id: `audit-1`,
          action: `verification_approve`,
          resource: `consumer`,
          resourceId: `consumer-1`,
          adminEmail: `admin@example.com`,
          createdAt: `2026-04-15T10:00:00.000Z`,
        },
      ],
    });
  });

  it(`falls back stale exchange rate cutoff to 24h when env hours are invalid`, () => {
    const now = new Date(`2026-04-15T12:00:00.000Z`);

    expect(buildRateStaleCutoff(now, 12)).toEqual(new Date(`2026-04-15T00:00:00.000Z`));
    expect(buildRateStaleCutoff(now, Number.NaN)).toEqual(new Date(`2026-04-14T12:00:00.000Z`));
    expect(buildRateStaleCutoff(now, 0)).toEqual(new Date(`2026-04-14T12:00:00.000Z`));
  });
});
