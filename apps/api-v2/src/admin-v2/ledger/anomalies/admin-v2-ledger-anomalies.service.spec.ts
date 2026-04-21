import { BadRequestException } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { AdminV2LedgerAnomaliesService } from './admin-v2-ledger-anomalies.service';
import { decodeAdminV2Cursor } from '../../admin-v2-cursor';

describe(`AdminV2LedgerAnomaliesService`, () => {
  function makeService() {
    const queryRaw = jest.fn<Promise<unknown[]>, [Prisma.Sql]>(async () => [{ count: 0 }]);
    const prisma = {
      $queryRaw: queryRaw,
    };

    return {
      prisma,
      service: new AdminV2LedgerAnomaliesService(prisma as never),
    };
  }

  it(`aggregates the anomaly classes into one summary payload`, async () => {
    const { prisma, service } = makeService();
    prisma.$queryRaw
      .mockResolvedValueOnce([{ count: 2 }])
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ count: 3 }])
      .mockResolvedValueOnce([{ count: 4 }])
      .mockResolvedValueOnce([{ count: 5 }])
      .mockResolvedValueOnce([{ count: 6 }]);

    const summary = await service.getSummary();

    expect(summary.totalCount).toBe(21);
    expect(Object.keys(summary.classes)).toEqual([
      `stalePendingEntries`,
      `inconsistentOutcomeChains`,
      `largeValueOutliers`,
      `orphanedEntries`,
      `duplicateIdempotencyRisk`,
      `impossibleTransitions`,
    ]);
    expect(summary.classes.stalePendingEntries).toEqual({
      label: `Stale pending entries`,
      count: 2,
      phaseStatus: `live-actionable`,
      availability: `available`,
      href: `/ledger/anomalies?class=stalePendingEntries`,
    });
    expect(summary.classes.inconsistentOutcomeChains.count).toBe(1);
    expect(summary.classes.largeValueOutliers.count).toBe(3);
    expect(summary.classes.orphanedEntries.count).toBe(4);
    expect(summary.classes.duplicateIdempotencyRisk.count).toBe(5);
    expect(summary.classes.impossibleTransitions.count).toBe(6);
  });

  it(`marks a class temporarily unavailable when its summary query fails`, async () => {
    const { prisma, service } = makeService();
    prisma.$queryRaw
      .mockResolvedValueOnce([{ count: 4 }])
      .mockRejectedValueOnce(new Error(`boom`))
      .mockResolvedValueOnce([{ count: 7 }]);

    const summary = await service.getSummary();

    expect(summary.totalCount).toBe(11);
    expect(summary.classes.stalePendingEntries.availability).toBe(`available`);
    expect(summary.classes.inconsistentOutcomeChains).toEqual({
      label: `Inconsistent outcome chains`,
      count: null,
      phaseStatus: `live-actionable`,
      availability: `temporarily-unavailable`,
      href: `/ledger/anomalies?class=inconsistentOutcomeChains`,
    });
    expect(summary.classes.largeValueOutliers.availability).toBe(`available`);
  });

  it(`marks orphaned entries temporarily unavailable when its summary query fails`, async () => {
    const { prisma, service } = makeService();
    prisma.$queryRaw
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ count: 2 }])
      .mockResolvedValueOnce([{ count: 3 }])
      .mockRejectedValueOnce(new Error(`boom`))
      .mockResolvedValueOnce([{ count: 5 }])
      .mockResolvedValueOnce([{ count: 6 }]);

    const summary = await service.getSummary();

    expect(summary.totalCount).toBe(17);
    expect(summary.classes.orphanedEntries).toEqual({
      label: `Orphaned entries`,
      count: null,
      phaseStatus: `live-actionable`,
      availability: `temporarily-unavailable`,
      href: `/ledger/anomalies?class=orphanedEntries`,
    });
  });

  it(`marks duplicate idempotency risk temporarily unavailable when its summary query fails`, async () => {
    const { prisma, service } = makeService();
    prisma.$queryRaw
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ count: 2 }])
      .mockResolvedValueOnce([{ count: 3 }])
      .mockResolvedValueOnce([{ count: 4 }])
      .mockRejectedValueOnce(new Error(`boom`))
      .mockResolvedValueOnce([{ count: 6 }]);

    const summary = await service.getSummary();

    expect(summary.totalCount).toBe(16);
    expect(summary.classes.duplicateIdempotencyRisk).toEqual({
      label: `Duplicate idempotency risk`,
      count: null,
      phaseStatus: `live-actionable`,
      availability: `temporarily-unavailable`,
      href: `/ledger/anomalies?class=duplicateIdempotencyRisk`,
    });
  });

  it(`marks impossible transitions temporarily unavailable when its summary query fails`, async () => {
    const { prisma, service } = makeService();
    prisma.$queryRaw
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ count: 2 }])
      .mockResolvedValueOnce([{ count: 3 }])
      .mockResolvedValueOnce([{ count: 4 }])
      .mockResolvedValueOnce([{ count: 5 }])
      .mockRejectedValueOnce(new Error(`boom`));

    const summary = await service.getSummary();

    expect(summary.totalCount).toBe(15);
    expect(summary.classes.impossibleTransitions).toEqual({
      label: `Impossible transitions`,
      count: null,
      phaseStatus: `live-actionable`,
      availability: `temporarily-unavailable`,
      href: `/ledger/anomalies?class=impossibleTransitions`,
    });
  });

  it(`returns paginated stale pending entries with anomaly detail`, async () => {
    const { prisma, service } = makeService();
    prisma.$queryRaw.mockResolvedValueOnce([
      {
        id: `entry-1`,
        ledgerEntryId: `entry-1`,
        consumerId: `consumer-1`,
        type: `USER_PAYMENT`,
        amount: new Prisma.Decimal(`150.50`),
        currencyCode: `USD`,
        entryStatus: `PENDING`,
        outcomeStatus: `PROCESSING`,
        outcomeAt: new Date(`2026-04-05T10:00:00.000Z`),
        createdAt: new Date(`2026-04-01T09:00:00.000Z`),
        updatedAt: new Date(`2026-04-05T10:05:00.000Z`),
        anomalyAt: new Date(`2026-04-05T10:00:00.000Z`),
        threshold: null,
      },
      {
        id: `entry-2`,
        ledgerEntryId: `entry-2`,
        consumerId: `consumer-2`,
        type: `USER_PAYMENT`,
        amount: new Prisma.Decimal(`88.00`),
        currencyCode: `EUR`,
        entryStatus: `PENDING`,
        outcomeStatus: `PENDING`,
        outcomeAt: new Date(`2026-04-04T10:00:00.000Z`),
        createdAt: new Date(`2026-04-02T09:00:00.000Z`),
        updatedAt: new Date(`2026-04-04T10:05:00.000Z`),
        anomalyAt: new Date(`2026-04-04T10:00:00.000Z`),
        threshold: null,
      },
    ]);

    const result = await service.getList({
      className: `stalePendingEntries`,
      dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
      dateTo: new Date(`2026-04-20T00:00:00.000Z`),
      limit: 1,
    });

    expect(result.class).toBe(`stalePendingEntries`);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: `entry-1`,
        ledgerEntryId: `entry-1`,
        consumerId: `consumer-1`,
        amount: `150.5`,
        outcomeStatus: `PROCESSING`,
      }),
    );
    expect(result.items[0].signal.class).toBe(`stalePendingEntries`);
    expect(result.items[0].signal.detail).toContain(`threshold 24h`);
    expect(result.nextCursor).not.toBeNull();
    expect(decodeAdminV2Cursor(result.nextCursor ?? undefined)).toEqual({
      createdAt: new Date(`2026-04-04T10:00:00.000Z`),
      id: `entry-2`,
    });
  });

  it(`returns inconsistent outcome chains with grace-window detail`, async () => {
    const { prisma, service } = makeService();
    prisma.$queryRaw.mockResolvedValueOnce([
      {
        id: `entry-3`,
        ledgerEntryId: `entry-3`,
        consumerId: `consumer-3`,
        type: `USER_PAYOUT`,
        amount: new Prisma.Decimal(`-999.99`),
        currencyCode: `GBP`,
        entryStatus: `PENDING`,
        outcomeStatus: `DENIED`,
        outcomeAt: new Date(`2026-04-06T08:00:00.000Z`),
        createdAt: new Date(`2026-04-05T07:00:00.000Z`),
        updatedAt: new Date(`2026-04-06T08:05:00.000Z`),
        anomalyAt: new Date(`2026-04-06T08:00:00.000Z`),
        threshold: null,
      },
    ]);

    const result = await service.getList({
      className: `inconsistentOutcomeChains`,
      dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
    });

    expect(result.items[0].signal.detail).toContain(`Persisted status PENDING but latest outcome DENIED`);
    expect(result.items[0].signal.detail).toContain(`beyond 60m sync window`);
  });

  it(`returns large value outliers with threshold detail`, async () => {
    const { prisma, service } = makeService();
    prisma.$queryRaw.mockResolvedValueOnce([
      {
        id: `entry-4`,
        ledgerEntryId: `entry-4`,
        consumerId: `consumer-4`,
        type: `USER_PAYOUT`,
        amount: new Prisma.Decimal(`-1500000.00`),
        currencyCode: `JPY`,
        entryStatus: `COMPLETED`,
        outcomeStatus: null,
        outcomeAt: null,
        createdAt: new Date(`2026-04-07T09:00:00.000Z`),
        updatedAt: new Date(`2026-04-07T09:30:00.000Z`),
        anomalyAt: new Date(`2026-04-07T09:00:00.000Z`),
        threshold: 1500000,
      },
    ]);

    const result = await service.getList({
      className: `largeValueOutliers`,
      dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
    });

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        entryStatus: `COMPLETED`,
        outcomeStatus: null,
        currencyCode: `JPY`,
      }),
    );
    expect(result.items[0].signal.detail).toContain(`|1500000| JPY exceeds large-value threshold 1,500,000`);
  });

  it(`returns orphaned entries with no-outcome detail and cursor pagination`, async () => {
    const { prisma, service } = makeService();
    prisma.$queryRaw.mockResolvedValueOnce([
      {
        id: `entry-orphan-1`,
        ledgerEntryId: `entry-orphan-1`,
        consumerId: `consumer-orphan-1`,
        type: `USER_PAYMENT`,
        amount: new Prisma.Decimal(`42.00`),
        currencyCode: `USD`,
        entryStatus: `PENDING`,
        outcomeStatus: null,
        outcomeAt: null,
        createdAt: new Date(`2026-04-08T10:00:00.000Z`),
        updatedAt: new Date(`2026-04-08T10:30:00.000Z`),
        anomalyAt: new Date(`2026-04-08T10:00:00.000Z`),
        threshold: null,
        stripeId: null,
        prevStatus: null,
        nextStatus: null,
      },
      {
        id: `entry-orphan-2`,
        ledgerEntryId: `entry-orphan-2`,
        consumerId: `consumer-orphan-2`,
        type: `USER_PAYOUT`,
        amount: new Prisma.Decimal(`-10.00`),
        currencyCode: `EUR`,
        entryStatus: `WAITING`,
        outcomeStatus: null,
        outcomeAt: null,
        createdAt: new Date(`2026-04-07T10:00:00.000Z`),
        updatedAt: new Date(`2026-04-07T10:30:00.000Z`),
        anomalyAt: new Date(`2026-04-07T10:00:00.000Z`),
        threshold: null,
        stripeId: null,
        prevStatus: null,
        nextStatus: null,
      },
    ]);

    const result = await service.getList({
      className: `orphanedEntries`,
      dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
      dateTo: new Date(`2026-04-20T00:00:00.000Z`),
      limit: 1,
    });

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: `entry-orphan-1`,
        outcomeStatus: null,
        outcomeAt: null,
      }),
    );
    expect(result.items[0].signal.class).toBe(`orphanedEntries`);
    expect(result.items[0].signal.detail).toContain(`has no outcome record (grace 1h)`);
    expect(decodeAdminV2Cursor(result.nextCursor ?? undefined)).toEqual({
      createdAt: new Date(`2026-04-07T10:00:00.000Z`),
      id: `entry-orphan-2`,
    });
  });

  it(`returns duplicate idempotency risk entries with stripe detail`, async () => {
    const { prisma, service } = makeService();
    prisma.$queryRaw.mockResolvedValueOnce([
      {
        id: `entry-dup-1`,
        ledgerEntryId: `entry-dup-1`,
        consumerId: `consumer-dup-1`,
        type: `USER_PAYMENT`,
        amount: new Prisma.Decimal(`90.00`),
        currencyCode: `USD`,
        entryStatus: `COMPLETED`,
        outcomeStatus: null,
        outcomeAt: null,
        createdAt: new Date(`2026-04-09T10:00:00.000Z`),
        updatedAt: new Date(`2026-04-09T10:30:00.000Z`),
        anomalyAt: new Date(`2026-04-09T10:00:00.000Z`),
        threshold: null,
        stripeId: `pi_123`,
        prevStatus: null,
        nextStatus: null,
      },
    ]);

    const result = await service.getList({
      className: `duplicateIdempotencyRisk`,
      dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
      dateTo: new Date(`2026-04-20T00:00:00.000Z`),
    });

    expect(result.items[0].signal.class).toBe(`duplicateIdempotencyRisk`);
    expect(result.items[0].signal.detail).toContain(`stripeId pi_123`);
    expect(result.items[0].signal.detail).toContain(`must be idempotent`);
  });

  it(`returns impossible transitions ordered by violation time`, async () => {
    const { prisma, service } = makeService();
    prisma.$queryRaw.mockResolvedValueOnce([
      {
        id: `entry-transition-1`,
        ledgerEntryId: `entry-transition-1`,
        consumerId: `consumer-transition-1`,
        type: `USER_PAYOUT`,
        amount: new Prisma.Decimal(`-999.99`),
        currencyCode: `GBP`,
        entryStatus: `PENDING`,
        outcomeStatus: `PENDING`,
        outcomeAt: new Date(`2026-04-10T12:00:00.000Z`),
        createdAt: new Date(`2026-04-10T10:00:00.000Z`),
        updatedAt: new Date(`2026-04-10T12:05:00.000Z`),
        anomalyAt: new Date(`2026-04-10T12:00:00.000Z`),
        threshold: null,
        stripeId: null,
        prevStatus: `COMPLETED`,
        nextStatus: `PENDING`,
      },
      {
        id: `entry-transition-2`,
        ledgerEntryId: `entry-transition-2`,
        consumerId: `consumer-transition-2`,
        type: `USER_PAYMENT`,
        amount: new Prisma.Decimal(`15.00`),
        currencyCode: `USD`,
        entryStatus: `WAITING`,
        outcomeStatus: `DENIED`,
        outcomeAt: new Date(`2026-04-09T12:00:00.000Z`),
        createdAt: new Date(`2026-04-09T10:00:00.000Z`),
        updatedAt: new Date(`2026-04-09T12:05:00.000Z`),
        anomalyAt: new Date(`2026-04-09T12:00:00.000Z`),
        threshold: null,
        stripeId: null,
        prevStatus: `UNCOLLECTIBLE`,
        nextStatus: `DENIED`,
      },
    ]);

    const result = await service.getList({
      className: `impossibleTransitions`,
      dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
      dateTo: new Date(`2026-04-20T00:00:00.000Z`),
      limit: 1,
    });

    expect(result.items[0].signal.class).toBe(`impossibleTransitions`);
    expect(result.items[0].signal.detail).toContain(`COMPLETED → PENDING`);
    expect(result.items[0].signal.detail).toContain(`COMPLETED is terminal`);
    expect(decodeAdminV2Cursor(result.nextCursor ?? undefined)).toEqual({
      createdAt: new Date(`2026-04-09T12:00:00.000Z`),
      id: `entry-transition-2`,
    });
  });

  it(`rejects list requests without dateFrom`, async () => {
    const { service } = makeService();

    await expect(
      service.getList({
        className: `largeValueOutliers`,
      }),
    ).rejects.toEqual(new BadRequestException(`dateFrom is required`));
  });

  it(`rejects list requests with a range above 30 days`, async () => {
    const { service } = makeService();

    await expect(
      service.getList({
        className: `largeValueOutliers`,
        dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
        dateTo: new Date(`2026-05-02T00:00:00.000Z`),
      }),
    ).rejects.toEqual(new BadRequestException(`range exceeds maximum of 30 days`));
  });

  it(`rejects list requests when dateFrom is after dateTo`, async () => {
    const { service } = makeService();

    await expect(
      service.getList({
        className: `largeValueOutliers`,
        dateFrom: new Date(`2026-04-03T00:00:00.000Z`),
        dateTo: new Date(`2026-04-02T00:00:00.000Z`),
      }),
    ).rejects.toEqual(new BadRequestException(`dateFrom cannot be after dateTo`));
  });

  it(`rejects unknown anomaly classes`, async () => {
    const { service } = makeService();

    await expect(
      service.getList({
        className: `unknown-class`,
        dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
      }),
    ).rejects.toEqual(new BadRequestException(`Unknown ledger anomaly class`));
  });

  describe(`getCount`, () => {
    const dateFrom = `2026-04-01T00:00:00.000Z`;
    const dateTo = `2026-04-20T00:00:00.000Z`;

    it.each([
      [`stalePendingEntries`],
      [`inconsistentOutcomeChains`],
      [`largeValueOutliers`],
      [`orphanedEntries`],
      [`duplicateIdempotencyRisk`],
      [`impossibleTransitions`],
    ] as const)(`returns numeric count for %s class`, async (className) => {
      const { prisma, service } = makeService();
      prisma.$queryRaw.mockResolvedValueOnce([{ count: 7 }]);

      const result = await service.getCount(className, dateFrom, dateTo);

      expect(result).toBe(7);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it(`returns 0 when underlying query yields an empty rowset`, async () => {
      const { prisma, service } = makeService();
      prisma.$queryRaw.mockResolvedValueOnce([]);

      const result = await service.getCount(`stalePendingEntries`, dateFrom, dateTo);

      expect(result).toBe(0);
    });

    it(`rejects when dateFrom is missing or unparseable`, async () => {
      const { service } = makeService();

      await expect(service.getCount(`stalePendingEntries`, `not-a-date`, dateTo)).rejects.toEqual(
        new BadRequestException(`dateFrom is required`),
      );
    });

    it(`rejects when dateFrom is after dateTo (mirrors getList semantics)`, async () => {
      const { service } = makeService();

      await expect(
        service.getCount(`stalePendingEntries`, `2026-04-03T00:00:00.000Z`, `2026-04-02T00:00:00.000Z`),
      ).rejects.toEqual(new BadRequestException(`dateFrom cannot be after dateTo`));
    });

    it(`rejects unknown anomaly classes (mirrors getList semantics)`, async () => {
      const { service } = makeService();

      await expect(service.getCount(`unknown-class` as never, dateFrom, dateTo)).rejects.toEqual(
        new BadRequestException(`Unknown ledger anomaly class`),
      );
    });

    it(`agrees with getList items length on a synthetic stalePendingEntries fixture`, async () => {
      const { prisma, service } = makeService();
      const synthetic = [
        {
          id: `entry-A`,
          ledgerEntryId: `entry-A`,
          consumerId: `consumer-A`,
          type: `USER_PAYMENT`,
          amount: new Prisma.Decimal(`10.00`),
          currencyCode: `USD`,
          entryStatus: `PENDING`,
          outcomeStatus: `PENDING`,
          outcomeAt: new Date(`2026-04-05T10:00:00.000Z`),
          createdAt: new Date(`2026-04-01T09:00:00.000Z`),
          updatedAt: new Date(`2026-04-05T10:05:00.000Z`),
          anomalyAt: new Date(`2026-04-05T10:00:00.000Z`),
          threshold: null,
        },
        {
          id: `entry-B`,
          ledgerEntryId: `entry-B`,
          consumerId: `consumer-B`,
          type: `USER_PAYMENT`,
          amount: new Prisma.Decimal(`20.00`),
          currencyCode: `USD`,
          entryStatus: `PENDING`,
          outcomeStatus: `PENDING`,
          outcomeAt: new Date(`2026-04-04T10:00:00.000Z`),
          createdAt: new Date(`2026-04-02T09:00:00.000Z`),
          updatedAt: new Date(`2026-04-04T10:05:00.000Z`),
          anomalyAt: new Date(`2026-04-04T10:00:00.000Z`),
          threshold: null,
        },
        {
          id: `entry-C`,
          ledgerEntryId: `entry-C`,
          consumerId: `consumer-C`,
          type: `USER_PAYMENT`,
          amount: new Prisma.Decimal(`30.00`),
          currencyCode: `USD`,
          entryStatus: `PENDING`,
          outcomeStatus: `PENDING`,
          outcomeAt: new Date(`2026-04-03T10:00:00.000Z`),
          createdAt: new Date(`2026-04-03T09:00:00.000Z`),
          updatedAt: new Date(`2026-04-03T10:05:00.000Z`),
          anomalyAt: new Date(`2026-04-03T10:00:00.000Z`),
          threshold: null,
        },
      ];
      prisma.$queryRaw.mockResolvedValueOnce(synthetic).mockResolvedValueOnce([{ count: synthetic.length }]);

      const list = await service.getList({
        className: `stalePendingEntries`,
        dateFrom: new Date(dateFrom),
        dateTo: new Date(dateTo),
        limit: 200,
      });
      const count = await service.getCount(`stalePendingEntries`, dateFrom, dateTo);

      expect(list.items).toHaveLength(synthetic.length);
      expect(count).toBe(synthetic.length);
      expect(list.items.length).toBe(count);
    });
  });
});
