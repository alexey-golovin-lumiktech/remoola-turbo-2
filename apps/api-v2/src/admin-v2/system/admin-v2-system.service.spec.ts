import { AdminV2SystemService } from './admin-v2-system.service';

describe(`AdminV2SystemService`, () => {
  function makeService() {
    const prisma = {
      $queryRaw: jest.fn(),
      stripeWebhookEventModel: {
        aggregate: jest.fn(),
      },
      resetPasswordModel: {
        count: jest.fn(),
      },
      oauthStateModel: {
        count: jest.fn(),
      },
    };

    return {
      prisma,
      service: new AdminV2SystemService(
        prisma as never,
        {
          getSummary: jest.fn(async () => ({
            computedAt: `2026-04-17T12:00:00.000Z`,
            totalCount: 0,
            classes: {
              stalePendingEntries: { count: 0 },
              inconsistentOutcomeChains: { count: 0 },
              largeValueOutliers: { count: 0 },
              orphanedEntries: { count: 0 },
              duplicateIdempotencyRisk: { count: 0 },
              impossibleTransitions: { count: 0 },
            },
          })),
        } as never,
      ),
    };
  }

  it(`composes the five admissible cards into one read-only summary`, async () => {
    const { service } = makeService();
    const serviceWithPrivates = service as any;

    jest.spyOn(serviceWithPrivates, `getStripeWebhookHealth`).mockResolvedValue({
      label: `Stripe webhook health`,
      status: `healthy`,
      explanation: `ok`,
      facts: [],
      primaryAction: null,
      escalationHint: null,
    });
    jest.spyOn(serviceWithPrivates, `getSchedulerHealth`).mockResolvedValue({
      label: `Scheduler health`,
      status: `watch`,
      explanation: `watch`,
      facts: [],
      primaryAction: null,
      escalationHint: `Escalate`,
    });
    jest.spyOn(serviceWithPrivates, `getLedgerAnomaliesCard`).mockResolvedValue({
      label: `Ledger anomalies`,
      status: `watch`,
      explanation: `watch`,
      facts: [],
      primaryAction: { label: `Open ledger anomalies`, href: `/ledger/anomalies` },
      escalationHint: `Escalate`,
    });
    jest.spyOn(serviceWithPrivates, `getEmailDeliveryIssuePatterns`).mockResolvedValue({
      label: `Email delivery issue patterns`,
      status: `healthy`,
      explanation: `ok`,
      facts: [],
      primaryAction: null,
      escalationHint: null,
    });
    jest.spyOn(serviceWithPrivates, `getStaleExchangeRateAlerts`).mockResolvedValue({
      label: `Stale exchange rate alerts`,
      status: `watch`,
      explanation: `watch`,
      facts: [],
      primaryAction: { label: `Open stale exchange rates`, href: `/exchange/rates?stale=true` },
      escalationHint: `Escalate`,
    });

    const summary = await service.getSummary();

    expect(summary.computedAt).toEqual(expect.any(String));
    expect(summary.cards).toEqual({
      stripeWebhookHealth: expect.objectContaining({ label: `Stripe webhook health` }),
      schedulerHealth: expect.objectContaining({ label: `Scheduler health` }),
      ledgerAnomalies: expect.objectContaining({ label: `Ledger anomalies` }),
      emailDeliveryIssuePatterns: expect.objectContaining({ label: `Email delivery issue patterns` }),
      staleExchangeRateAlerts: expect.objectContaining({ label: `Stale exchange rate alerts` }),
    });
  });

  it(`marks ledger anomalies as watch when the read-only queue reports backlog`, async () => {
    const { prisma } = makeService();
    const service = new AdminV2SystemService(
      prisma as never,
      {
        getSummary: jest.fn(async () => ({
          computedAt: `2026-04-17T12:00:00.000Z`,
          totalCount: 4,
          classes: {
            stalePendingEntries: { count: 2 },
            inconsistentOutcomeChains: { count: 1 },
            largeValueOutliers: { count: 1 },
            orphanedEntries: { count: 3 },
            duplicateIdempotencyRisk: { count: 4 },
            impossibleTransitions: { count: 5 },
          },
        })),
      } as never,
    );

    const card = await (service as any).getLedgerAnomaliesCard();

    expect(card.status).toBe(`watch`);
    expect(card.primaryAction).toEqual({
      label: `Open ledger anomalies`,
      href: `/ledger/anomalies`,
    });
    expect(card.facts).toEqual([
      { label: `Total anomaly backlog`, value: 4 },
      { label: `Stale pending entries`, value: 2 },
      { label: `Inconsistent outcome chains`, value: 1 },
      { label: `Large value outliers`, value: 1 },
      { label: `Orphaned entries`, value: 3 },
      { label: `Duplicate idempotency risk`, value: 4 },
      { label: `Impossible transitions`, value: 5 },
    ]);
  });

  it(`marks stripe webhook health as watch when payment and reversal ingestion lag is present`, async () => {
    const { prisma, service } = makeService();
    prisma.$queryRaw
      .mockResolvedValueOnce([{ count: 2, oldestAt: new Date(`2026-04-17T09:00:00.000Z`) }])
      .mockResolvedValueOnce([{ count: 1, oldestAt: new Date(`2026-04-17T10:00:00.000Z`) }]);
    prisma.stripeWebhookEventModel.aggregate.mockResolvedValue({
      _max: { createdAt: new Date(`2026-04-17T11:55:00.000Z`) },
    });

    const card = await (service as any).getStripeWebhookHealth(new Date(`2026-04-17T12:00:00.000Z`));

    expect(card.status).toBe(`watch`);
    expect(card.primaryAction).toEqual({
      label: `Open affected payments`,
      href: `/payments?status=WAITING`,
    });
    expect(card.facts).toEqual(
      expect.arrayContaining([
        { label: `Pending checkout settlements`, value: 2 },
        { label: `Pending reversal reconciliations`, value: 1 },
      ]),
    );
  });

  it(`reports email delivery patterns as temporarily unavailable when the audit source is not readable`, async () => {
    const { prisma, service } = makeService();
    prisma.$queryRaw.mockRejectedValue(new Error(`db unavailable`));

    const card = await (service as any).getEmailDeliveryIssuePatterns(new Date(`2026-04-17T12:00:00.000Z`));

    expect(card.status).toBe(`temporarily-unavailable`);
    expect(card.primaryAction).toBeNull();
    expect(card.escalationHint).toContain(`Escalate mail delivery degradation`);
  });
});
