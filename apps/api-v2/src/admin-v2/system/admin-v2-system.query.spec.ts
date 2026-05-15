import { type Prisma } from '@remoola/database-2';

import { AdminV2SystemQuery } from './admin-v2-system.query';

function queryToString(query: unknown): string {
  if (typeof query === `string`) {
    return query;
  }
  if (
    query &&
    typeof query === `object` &&
    `strings` in query &&
    Array.isArray((query as { strings: string[] }).strings)
  ) {
    return (query as { strings: string[] }).strings.join(`?`);
  }
  return String(query);
}

describe(`AdminV2SystemQuery`, () => {
  function makeQuery() {
    const prisma = {
      $queryRaw: jest.fn<Promise<unknown[]>, [Prisma.Sql]>(async () => []),
      stripeWebhookEventModel: {
        aggregate: jest.fn(async () => ({ _max: { createdAt: null } })),
      },
      resetPasswordModel: {
        count: jest.fn(async () => 0),
      },
      oauthStateModel: {
        count: jest.fn(async () => 0),
      },
    };

    return {
      prisma,
      query: new AdminV2SystemQuery(prisma as never),
    };
  }

  it(`loads the latest processed webhook timestamp through aggregate`, async () => {
    const { prisma, query } = makeQuery();
    prisma.stripeWebhookEventModel.aggregate.mockResolvedValueOnce({
      _max: { createdAt: new Date(`2026-04-17T11:55:00.000Z`) },
    });

    const result = await query.getLatestProcessedWebhookAt();

    expect(result).toEqual(new Date(`2026-04-17T11:55:00.000Z`));
    expect(prisma.stripeWebhookEventModel.aggregate).toHaveBeenCalledWith({
      _max: { createdAt: true },
    });
  });

  it(`uses dedicated count filters for expired auth cleanup rows`, async () => {
    const { prisma, query } = makeQuery();
    const now = new Date(`2026-04-17T12:00:00.000Z`);

    await query.countExpiredResetPasswords(now);
    await query.countExpiredOauthStates(now);

    expect(prisma.resetPasswordModel.count).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        expiredAt: { lt: now },
      },
    });
    expect(prisma.oauthStateModel.count).toHaveBeenCalledWith({
      where: {
        expiresAt: { lt: now },
      },
    });
  });

  it(`loads email delivery issue patterns through the audit raw SQL probe`, async () => {
    const { prisma, query } = makeQuery();
    const windowStart = new Date(`2026-04-10T12:00:00.000Z`);
    prisma.$queryRaw.mockResolvedValueOnce([
      { action: `verification_approve`, count: 2, lastFailedAt: new Date(`2026-04-17T09:00:00.000Z`) },
    ]);

    const result = await query.listEmailDeliveryIssuePatterns(windowStart);

    expect(result).toHaveLength(1);
    const sql = queryToString(prisma.$queryRaw.mock.calls[0][0]);
    expect(sql).toContain(`FROM admin_action_audit_log AS log`);
    expect(sql).toContain(`COALESCE(log.metadata->>'notificationType', '') = 'email'`);
    expect(sql).toContain(`ORDER BY COUNT(*) DESC, MAX(log.created_at) DESC`);
  });

  it(`loads the two Stripe lag snapshots through raw SQL probes`, async () => {
    const { prisma, query } = makeQuery();
    prisma.$queryRaw
      .mockResolvedValueOnce([{ count: 2, oldestAt: new Date(`2026-04-17T09:00:00.000Z`) }])
      .mockResolvedValueOnce([{ count: 1, oldestAt: new Date(`2026-04-17T10:00:00.000Z`) }]);

    const checkoutLag = await query.getStripeCheckoutLag();
    const reversalLag = await query.getStripeReversalLag();

    expect(checkoutLag).toEqual({
      count: 2,
      oldestAt: new Date(`2026-04-17T09:00:00.000Z`),
    });
    expect(reversalLag).toEqual({
      count: 1,
      oldestAt: new Date(`2026-04-17T10:00:00.000Z`),
    });
    expect(queryToString(prisma.$queryRaw.mock.calls[0][0])).toContain(`latest.external_id LIKE 'cs\\_%' ESCAPE '\\'`);
    expect(queryToString(prisma.$queryRaw.mock.calls[1][0])).toContain(
      `entry.type::text IN ('USER_PAYMENT_REVERSAL', 'USER_DEPOSIT_REVERSAL')`,
    );
  });

  it(`loads overdue scheduled conversions through the scheduler raw SQL probe`, async () => {
    const { prisma, query } = makeQuery();
    const now = new Date(`2026-04-17T12:00:00.000Z`);
    prisma.$queryRaw.mockResolvedValueOnce([{ count: 3, oldestAt: new Date(`2026-04-17T08:00:00.000Z`) }]);

    const result = await query.getOverdueScheduledConversions(now);

    expect(result).toEqual({
      count: 3,
      oldestAt: new Date(`2026-04-17T08:00:00.000Z`),
    });
    const sql = queryToString(prisma.$queryRaw.mock.calls[0][0]);
    expect(sql).toContain(`FROM scheduled_fx_conversion AS conversion`);
    expect(sql).toContain(`conversion.execute_at < ?`);
  });

  it(`loads stale rate snapshots with the supplied cutoff window`, async () => {
    const { prisma, query } = makeQuery();
    const now = new Date(`2026-04-17T12:00:00.000Z`);
    const staleCutoff = new Date(`2026-04-16T12:00:00.000Z`);
    prisma.$queryRaw.mockResolvedValueOnce([{ count: 4, oldestReferenceAt: new Date(`2026-04-15T09:00:00.000Z`) }]);

    const result = await query.getStaleRateSnapshot({ now, staleCutoff });

    expect(result).toEqual({
      count: 4,
      oldestReferenceAt: new Date(`2026-04-15T09:00:00.000Z`),
    });
    const sql = queryToString(prisma.$queryRaw.mock.calls[0][0]);
    expect(sql).toContain(`FROM exchange_rate AS rate`);
    expect(sql).toContain(`rate.status::text = 'APPROVED'`);
    expect(sql).toContain(`COALESCE(rate.fetched_at, rate.effective_at, rate.created_at) < ?`);
  });
});
