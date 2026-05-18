import { type Cache } from 'cache-manager';

import { $Enums, type Prisma } from '@remoola/database-2';

import { AdminV2OverviewQuery } from './admin-v2-overview.query';
import { AUTH_AUDIT_EVENTS, AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';

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

describe(`AdminV2OverviewQuery`, () => {
  function makeQuery() {
    const cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };
    const prisma = {
      $queryRaw: jest.fn<Promise<unknown[]>, [Prisma.Sql]>(async () => [{ count: 0 }]),
      consumerModel: { count: jest.fn(async () => 0) },
      authAuditLogModel: { count: jest.fn(async () => 0) },
      adminActionAuditLogModel: { findMany: jest.fn(async () => []) },
      paymentRequestModel: { count: jest.fn(async () => 0) },
      scheduledFxConversionModel: { count: jest.fn(async () => 0) },
    };

    return {
      cacheManager,
      prisma,
      query: new AdminV2OverviewQuery(cacheManager as unknown as Cache, prisma as never),
    };
  }

  it(`counts pending verifications with the active review statuses`, async () => {
    const { cacheManager, prisma, query } = makeQuery();

    await query.countPendingVerifications();

    expect(prisma.consumerModel.count).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        verificationStatus: {
          in: [
            $Enums.VerificationStatus.PENDING,
            $Enums.VerificationStatus.MORE_INFO,
            $Enums.VerificationStatus.FLAGGED,
          ],
        },
      },
    });
    expect(cacheManager.set).toHaveBeenCalledWith(`admin-v2-overview:pending-verifications`, 0, 30_000);
  });

  it(`returns cached overview counts without hitting the database`, async () => {
    const { cacheManager, prisma, query } = makeQuery();
    cacheManager.get.mockResolvedValue(7);

    await expect(query.countPendingVerifications()).resolves.toBe(7);

    expect(cacheManager.get).toHaveBeenCalledWith(`admin-v2-overview:pending-verifications`);
    expect(prisma.consumerModel.count).not.toHaveBeenCalled();
    expect(cacheManager.set).not.toHaveBeenCalled();
  });

  it(`counts suspicious auth events inside the requested window`, async () => {
    const { cacheManager, prisma, query } = makeQuery();
    const authWindowStart = new Date(`2026-04-14T10:00:00.000Z`);

    await query.countSuspiciousAuthEvents(authWindowStart);

    expect(prisma.authAuditLogModel.count).toHaveBeenCalledWith({
      where: {
        identityType: AUTH_IDENTITY_TYPES.consumer,
        event: AUTH_AUDIT_EVENTS.login_failure,
        createdAt: { gte: authWindowStart },
      },
    });
    expect(cacheManager.set).toHaveBeenCalledWith(
      `admin-v2-overview:suspicious-auth:2026-04-14T10:00:00.000Z`,
      0,
      30_000,
    );
  });

  it(`loads recent admin actions ordered newest-first`, async () => {
    const { cacheManager, prisma, query } = makeQuery();

    await query.listRecentAdminActions(5);

    expect(prisma.adminActionAuditLogModel.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: `desc` },
      take: 5,
      select: {
        id: true,
        action: true,
        resource: true,
        resourceId: true,
        createdAt: true,
        admin: {
          select: {
            email: true,
          },
        },
      },
    });
    expect(cacheManager.set).toHaveBeenCalledWith(`admin-v2-overview:recent-admin-actions:5`, [], 30_000);
  });

  it(`uses dedicated count filters for payment request and scheduled FX signals`, async () => {
    const { cacheManager, prisma, query } = makeQuery();
    const now = new Date(`2026-04-15T10:00:00.000Z`);

    await query.countOverduePaymentRequests(now);
    await query.countUncollectiblePaymentRequests();
    await query.countFailedScheduledConversions();

    expect(prisma.paymentRequestModel.count).toHaveBeenNthCalledWith(1, {
      where: {
        deletedAt: null,
        dueDate: { lt: now },
        status: {
          in: [
            $Enums.TransactionStatus.WAITING,
            $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
            $Enums.TransactionStatus.PENDING,
          ],
        },
      },
    });
    expect(prisma.paymentRequestModel.count).toHaveBeenNthCalledWith(2, {
      where: {
        deletedAt: null,
        status: $Enums.TransactionStatus.UNCOLLECTIBLE,
      },
    });
    expect(prisma.scheduledFxConversionModel.count).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        status: $Enums.ScheduledFxConversionStatus.FAILED,
      },
    });
    expect(cacheManager.set).toHaveBeenCalledWith(
      `admin-v2-overview:overdue-payment-requests:2026-04-15T10:00:00.000Z`,
      0,
      30_000,
    );
    expect(cacheManager.set).toHaveBeenCalledWith(`admin-v2-overview:uncollectible-payment-requests`, 0, 30_000);
    expect(cacheManager.set).toHaveBeenCalledWith(`admin-v2-overview:failed-scheduled-conversions`, 0, 30_000);
  });

  it(`counts open disputes through the raw SQL probe`, async () => {
    const { cacheManager, prisma, query } = makeQuery();
    prisma.$queryRaw.mockResolvedValueOnce([{ count: 4 }]);

    const result = await query.countOpenDisputes();

    expect(result).toBe(4);
    const sql = queryToString(prisma.$queryRaw.mock.calls[0][0]);
    expect(sql).toContain(`SELECT COUNT(*)::int AS count`);
    expect(sql).toContain(`FROM ledger_entry_dispute led`);
    expect(sql).toContain(`COALESCE(led.metadata->>'status', led.metadata->>'disputeStatus', '') IN`);
    expect(cacheManager.set).toHaveBeenCalledWith(`admin-v2-overview:open-disputes`, 4, 30_000);
  });

  it(`counts stale approved exchange rates with the supplied cutoff window`, async () => {
    const { cacheManager, prisma, query } = makeQuery();
    const now = new Date(`2026-04-15T10:00:00.000Z`);
    const staleCutoff = new Date(`2026-04-14T10:00:00.000Z`);
    prisma.$queryRaw.mockResolvedValueOnce([{ count: 9 }]);

    const result = await query.countStaleExchangeRates({ now, staleCutoff });

    expect(result).toBe(9);
    const sql = queryToString(prisma.$queryRaw.mock.calls[0][0]);
    expect(sql).toContain(`FROM exchange_rate rate`);
    expect(sql).toContain(`rate.status = ?::exchange_rate_status_enum`);
    expect(sql).toContain(`COALESCE(rate.fetched_at, rate.effective_at, rate.created_at) < ?`);
    expect(cacheManager.set).toHaveBeenCalledWith(
      `admin-v2-overview:stale-exchange-rates:2026-04-15T10:00:00.000Z:2026-04-14T10:00:00.000Z`,
      9,
      30_000,
    );
  });
});
