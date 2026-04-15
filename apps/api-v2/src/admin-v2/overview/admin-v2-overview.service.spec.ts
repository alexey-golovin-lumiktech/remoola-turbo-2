import { AdminV2OverviewService } from './admin-v2-overview.service';

describe(`AdminV2OverviewService`, () => {
  it(`returns canonical MVP-1b phase semantics for overview signals`, async () => {
    const service = new AdminV2OverviewService(
      {
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
      } as never,
      {
        getSnapshot: jest.fn(async () => ({
          breachedConsumerIds: new Set<string>([`consumer-1`]),
          thresholdHours: 24,
          lastComputedAt: `2026-04-15T10:05:00.000Z`,
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
    ]);
    expect(summary.signals.pendingVerifications.phaseStatus).toBe(`live-actionable`);
    expect(summary.signals.recentAdminActions.phaseStatus).toBe(`live-actionable`);
    expect(summary.signals.suspiciousAuthEvents.phaseStatus).toBe(`live-actionable`);
    expect(summary.signals.overduePaymentRequests.phaseStatus).toBe(`count-only`);
    expect(summary.signals.uncollectiblePaymentRequests.phaseStatus).toBe(`count-only`);
    expect(summary.signals.openDisputes).toEqual({
      label: `Open disputes`,
      count: null,
      phaseStatus: `count-only`,
      availability: `temporarily-unavailable`,
    });
    expect(summary.signals).not.toHaveProperty(`failedOrStuckPayouts`);
    expect(summary.signals).not.toHaveProperty(`failedScheduledConversions`);
    expect(summary.signals).not.toHaveProperty(`staleExchangeRates`);
    expect(summary.signals).not.toHaveProperty(`ledgerAnomalies`);
  });
});
