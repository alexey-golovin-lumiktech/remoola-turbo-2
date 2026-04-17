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
      service: new AdminV2SystemService(prisma as never),
    };
  }

  it(`composes the four admissible cards into one read-only summary`, async () => {
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
      emailDeliveryIssuePatterns: expect.objectContaining({ label: `Email delivery issue patterns` }),
      staleExchangeRateAlerts: expect.objectContaining({ label: `Stale exchange rate alerts` }),
    });
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
