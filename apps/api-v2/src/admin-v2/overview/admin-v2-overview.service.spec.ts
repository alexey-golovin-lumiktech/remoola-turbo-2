import { AdminV2OverviewService } from './admin-v2-overview.service';

describe(`AdminV2OverviewService`, () => {
  it(`returns canonical phase vocabulary for currently surfaced finance signals`, async () => {
    const service = new AdminV2OverviewService(
      {
        $queryRaw: jest.fn(async () => [{ count: 4 }]),
        consumerModel: { count: jest.fn(async () => 28) },
        authAuditLogModel: { count: jest.fn(async () => 5) },
        adminActionAuditLogModel: {
          findMany: jest.fn(async () => [
            {
              id: `audit-1`,
              action: `verification_approve`,
              resource: `consumer`,
              resourceId: `consumer-1`,
              createdAt: new Date(`2026-04-15T10:00:00.000Z`),
              admin: { email: `admin@example.com` },
            },
          ]),
        },
        paymentRequestModel: {
          count: jest.fn(async ({ where }: { where: { status?: string } }) =>
            where.status === `UNCOLLECTIBLE` ? 3 : 14,
          ),
        },
        scheduledFxConversionModel: {
          count: jest.fn(async () => 2),
        },
      } as never,
      {
        getSnapshot: jest.fn(async () => ({
          breachedConsumerIds: new Set<string>([`consumer-1`]),
          thresholdHours: 24,
          lastComputedAt: `2026-04-15T10:05:00.000Z`,
        })),
      } as never,
      {
        getSummary: jest.fn(async () => ({
          computedAt: `2026-04-15T10:05:00.000Z`,
          totalCount: 6,
          classes: {},
        })),
      } as never,
    );

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
  });

  it(`keeps temporarily-unavailable as fallback when dispute summary query fails`, async () => {
    const service = new AdminV2OverviewService(
      {
        $queryRaw: jest.fn(async () => {
          throw new Error(`query failed`);
        }),
        consumerModel: { count: jest.fn(async () => 1) },
        authAuditLogModel: { count: jest.fn(async () => 2) },
        adminActionAuditLogModel: {
          findMany: jest.fn(async () => []),
        },
        paymentRequestModel: {
          count: jest.fn(async () => 0),
        },
        scheduledFxConversionModel: {
          count: jest.fn(async () => 0),
        },
      } as never,
      {
        getSnapshot: jest.fn(async () => ({
          breachedConsumerIds: new Set<string>(),
          thresholdHours: 24,
          lastComputedAt: `2026-04-15T10:05:00.000Z`,
        })),
      } as never,
      {
        getSummary: jest.fn(async () => {
          throw new Error(`anomalies failed`);
        }),
      } as never,
    );

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
  });

  it(`keeps payment signals temporarily-unavailable when payment counters fail`, async () => {
    const paymentCount = jest
      .fn()
      .mockRejectedValueOnce(new Error(`overdue failed`))
      .mockRejectedValueOnce(new Error(`uncollectible failed`));
    const service = new AdminV2OverviewService(
      {
        $queryRaw: jest.fn(async () => [{ count: 4 }]),
        consumerModel: { count: jest.fn(async () => 1) },
        authAuditLogModel: { count: jest.fn(async () => 2) },
        adminActionAuditLogModel: {
          findMany: jest.fn(async () => []),
        },
        paymentRequestModel: {
          count: paymentCount,
        },
        scheduledFxConversionModel: {
          count: jest.fn(async () => 7),
        },
      } as never,
      {
        getSnapshot: jest.fn(async () => ({
          breachedConsumerIds: new Set<string>(),
          thresholdHours: 24,
          lastComputedAt: `2026-04-15T10:05:00.000Z`,
        })),
      } as never,
      {
        getSummary: jest.fn(async () => ({
          computedAt: `2026-04-15T10:05:00.000Z`,
          totalCount: 0,
          classes: {},
        })),
      } as never,
    );

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
  });
});
