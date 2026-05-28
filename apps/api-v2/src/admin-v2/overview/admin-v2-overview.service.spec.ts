import { describe, expect, it, jest } from '@jest/globals';

import { adminV2OverviewSummaryResponseSchema } from '@remoola/api-types';

import { type AdminV2OverviewQuery } from './admin-v2-overview.query';
import { AdminV2OverviewService } from './admin-v2-overview.service';

describe(`AdminV2OverviewService`, () => {
  function buildService() {
    const query = {
      countPendingVerifications: jest.fn<(...a: any[]) => any>(async () => 28),
      countSuspiciousAuthEvents: jest.fn<(...a: any[]) => any>(async () => 5),
      listRecentAdminActions: jest.fn<(...a: any[]) => any>(async () => [
        {
          id: `audit-1`,
          action: `verification_approve`,
          resource: `consumer`,
          resourceId: `consumer-1`,
          createdAt: new Date(`2026-04-15T10:00:00.000Z`),
          admin: { email: `admin@example.com` },
        },
      ]),
      countOverduePaymentRequests: jest.fn<(...a: any[]) => any>(async () => 14),
      countUncollectiblePaymentRequests: jest.fn<(...a: any[]) => any>(async () => 3),
      countOpenDisputes: jest.fn<(...a: any[]) => any>(async () => 4),
      countFailedScheduledConversions: jest.fn<(...a: any[]) => any>(async () => 2),
      countStaleExchangeRates: jest.fn<(...a: any[]) => any>(async () => 4),
    };
    const verificationSla = {
      getSnapshot: jest.fn<(...a: any[]) => any>(async () => ({
        breachedConsumerIds: new Set<string>([`consumer-1`]),
        thresholdHours: 24,
        lastComputedAt: `2026-04-15T10:05:00.000Z`,
      })),
    };
    const ledgerAnomalies = {
      getSummary: jest.fn<(...a: any[]) => any>(async () => ({
        computedAt: `2026-04-15T10:05:00.000Z`,
        totalCount: 6,
        classes: {},
      })),
    };

    return {
      service: new AdminV2OverviewService(
        query as unknown as AdminV2OverviewQuery,
        verificationSla as never,
        ledgerAnomalies as never,
      ),
      query,
      verificationSla,
      ledgerAnomalies,
    };
  }

  it(`returns canonical phase vocabulary for currently surfaced finance signals`, async () => {
    const { service } = buildService();

    const summary = await service.getSummary();

    expect(Object.keys(summary.signals)).toEqual([
      `pendingVerifications`,
      `recentAdminActions`,
      `suspiciousAuthEvents`,
      `overduePaymentRequests`,
      `uncollectiblePaymentRequests`,
      `openDisputes`,
      `ledgerAnomalies`,
      `failedScheduledConversions`,
      `staleExchangeRates`,
    ]);
    expect(summary.signals.pendingVerifications.phaseStatus).toBe(`live-actionable`);
    expect(summary.signals.recentAdminActions.phaseStatus).toBe(`live-actionable`);
    expect(summary.signals.suspiciousAuthEvents.phaseStatus).toBe(`live-actionable`);
    expect(summary.signals.overduePaymentRequests.phaseStatus).toBe(`live-actionable`);
    expect(summary.signals.overduePaymentRequests.href).toBe(`/payments?overdue=true`);
    expect(summary.signals.uncollectiblePaymentRequests.phaseStatus).toBe(`live-actionable`);
    expect(summary.signals.uncollectiblePaymentRequests.href).toBe(`/payments?status=UNCOLLECTIBLE`);
    expect(summary.signals.openDisputes).toEqual({
      label: `Open disputes`,
      count: 4,
      phaseStatus: `live-actionable`,
      availability: `available`,
      href: `/ledger?view=disputes`,
    });
    expect(summary.signals.ledgerAnomalies).toEqual({
      label: `Ledger anomalies`,
      count: 6,
      phaseStatus: `live-actionable`,
      availability: `available`,
      href: `/ledger/anomalies`,
    });
    expect(summary.signals.failedScheduledConversions).toEqual({
      label: `Failed scheduled FX`,
      count: 2,
      phaseStatus: `live-actionable`,
      availability: `available`,
      href: `/exchange/scheduled?status=FAILED`,
    });
    expect(summary.signals.staleExchangeRates).toEqual({
      label: `Stale exchange rates`,
      count: 4,
      phaseStatus: `live-actionable`,
      availability: `available`,
      href: `/exchange/rates?stale=true`,
    });
    expect(summary.signals).not.toHaveProperty(`failedOrStuckPayouts`);
    expect(adminV2OverviewSummaryResponseSchema.safeParse(summary).success).toBe(true);
  });

  it(`keeps temporarily-unavailable as fallback when overview query signals fail`, async () => {
    const { service, query, ledgerAnomalies } = buildService();
    query.countOpenDisputes.mockRejectedValueOnce(new Error(`query failed`));
    query.countStaleExchangeRates.mockRejectedValueOnce(new Error(`query failed`));
    ledgerAnomalies.getSummary.mockRejectedValueOnce(new Error(`anomalies failed`));

    const summary = await service.getSummary();

    expect(summary.signals.openDisputes).toEqual({
      label: `Open disputes`,
      count: null,
      phaseStatus: `live-actionable`,
      availability: `temporarily-unavailable`,
      href: `/ledger?view=disputes`,
    });
    expect(summary.signals.staleExchangeRates).toEqual({
      label: `Stale exchange rates`,
      count: null,
      phaseStatus: `live-actionable`,
      availability: `temporarily-unavailable`,
      href: `/exchange/rates?stale=true`,
    });
    expect(summary.signals.ledgerAnomalies).toEqual({
      label: `Ledger anomalies`,
      count: null,
      phaseStatus: `live-actionable`,
      availability: `temporarily-unavailable`,
      href: `/ledger/anomalies`,
    });
    expect(adminV2OverviewSummaryResponseSchema.safeParse(summary).success).toBe(true);
  });

  it(`keeps payment signals temporarily-unavailable when payment counters fail`, async () => {
    const { service, query } = buildService();
    query.countOverduePaymentRequests.mockRejectedValueOnce(new Error(`overdue failed`));
    query.countUncollectiblePaymentRequests.mockRejectedValueOnce(new Error(`uncollectible failed`));
    query.countFailedScheduledConversions.mockResolvedValueOnce(7);

    const summary = await service.getSummary();

    expect(summary.signals.overduePaymentRequests).toEqual({
      label: `Overdue payment requests`,
      count: null,
      phaseStatus: `live-actionable`,
      availability: `temporarily-unavailable`,
      href: `/payments?overdue=true`,
    });
    expect(summary.signals.uncollectiblePaymentRequests).toEqual({
      label: `Uncollectible payment requests`,
      count: null,
      phaseStatus: `live-actionable`,
      availability: `temporarily-unavailable`,
      href: `/payments?status=UNCOLLECTIBLE`,
    });
    expect(summary.signals.failedScheduledConversions).toEqual({
      label: `Failed scheduled FX`,
      count: 7,
      phaseStatus: `live-actionable`,
      availability: `available`,
      href: `/exchange/scheduled?status=FAILED`,
    });
    expect(adminV2OverviewSummaryResponseSchema.safeParse(summary).success).toBe(true);
  });
});
