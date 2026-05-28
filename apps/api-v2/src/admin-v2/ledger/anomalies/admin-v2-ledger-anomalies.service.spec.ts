import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { type AdminV2LedgerAnomaliesQuery } from './admin-v2-ledger-anomalies.query';
import { AdminV2LedgerAnomaliesService } from './admin-v2-ledger-anomalies.service';
import { decodeAdminV2Cursor } from '../../admin-v2-cursor';

describe(`AdminV2LedgerAnomaliesService`, () => {
  function createQueryMock() {
    return {
      countStalePendingEntries: jest.fn<(...a: any[]) => any>().mockResolvedValue(0),
      countInconsistentOutcomeChains: jest.fn<(...a: any[]) => any>().mockResolvedValue(0),
      countLargeValueOutliers: jest.fn<(...a: any[]) => any>().mockResolvedValue(0),
      countOrphanedEntries: jest.fn<(...a: any[]) => any>().mockResolvedValue(0),
      countDuplicateIdempotencyRisk: jest.fn<(...a: any[]) => any>().mockResolvedValue(0),
      countImpossibleTransitions: jest.fn<(...a: any[]) => any>().mockResolvedValue(0),
      countStalePendingEntriesForRange: jest.fn<(...a: any[]) => any>().mockResolvedValue(0),
      countInconsistentOutcomeChainsForRange: jest.fn<(...a: any[]) => any>().mockResolvedValue(0),
      countLargeValueOutliersForRange: jest.fn<(...a: any[]) => any>().mockResolvedValue(0),
      countOrphanedEntriesForRange: jest.fn<(...a: any[]) => any>().mockResolvedValue(0),
      countDuplicateIdempotencyRiskForRange: jest.fn<(...a: any[]) => any>().mockResolvedValue(0),
      countImpossibleTransitionsForRange: jest.fn<(...a: any[]) => any>().mockResolvedValue(0),
      listStalePendingEntries: jest.fn<(...a: any[]) => any>().mockResolvedValue([]),
      listInconsistentOutcomeChains: jest.fn<(...a: any[]) => any>().mockResolvedValue([]),
      listLargeValueOutliers: jest.fn<(...a: any[]) => any>().mockResolvedValue([]),
      listOrphanedEntries: jest.fn<(...a: any[]) => any>().mockResolvedValue([]),
      listDuplicateIdempotencyRisk: jest.fn<(...a: any[]) => any>().mockResolvedValue([]),
      listImpossibleTransitions: jest.fn<(...a: any[]) => any>().mockResolvedValue([]),
    };
  }

  function makeService() {
    const query = createQueryMock();
    return {
      query,
      service: new AdminV2LedgerAnomaliesService(query as unknown as AdminV2LedgerAnomaliesQuery),
    };
  }

  function makeRow(overrides?: Record<string, unknown>) {
    return {
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
      stripeId: null,
      prevStatus: null,
      nextStatus: null,
      ...overrides,
    };
  }

  it(`aggregates the anomaly classes into one summary payload`, async () => {
    const { query, service } = makeService();
    query.countStalePendingEntries.mockResolvedValueOnce(2);
    query.countInconsistentOutcomeChains.mockResolvedValueOnce(1);
    query.countLargeValueOutliers.mockResolvedValueOnce(3);
    query.countOrphanedEntries.mockResolvedValueOnce(4);
    query.countDuplicateIdempotencyRisk.mockResolvedValueOnce(5);
    query.countImpossibleTransitions.mockResolvedValueOnce(6);

    const summary = await service.getSummary();

    expect(summary.totalCount).toBe(21);
    expect(summary.classes.stalePendingEntries).toEqual({
      label: `Stale pending entries`,
      count: 2,
      phaseStatus: `live-actionable`,
      availability: `available`,
      href: `/ledger/anomalies?class=stalePendingEntries`,
    });
    expect(summary.classes.impossibleTransitions.count).toBe(6);
  });

  it(`marks a class temporarily unavailable when one summary query fails`, async () => {
    const { query, service } = makeService();
    query.countStalePendingEntries.mockResolvedValueOnce(4);
    query.countInconsistentOutcomeChains.mockRejectedValueOnce(new Error(`boom`));
    query.countLargeValueOutliers.mockResolvedValueOnce(7);

    const summary = await service.getSummary();

    expect(summary.totalCount).toBe(11);
    expect(summary.classes.inconsistentOutcomeChains).toEqual({
      label: `Inconsistent outcome chains`,
      count: null,
      phaseStatus: `live-actionable`,
      availability: `temporarily-unavailable`,
      href: `/ledger/anomalies?class=inconsistentOutcomeChains`,
    });
  });

  it(`maps paginated stale pending rows and emits the next cursor`, async () => {
    const { query, service } = makeService();
    query.listStalePendingEntries.mockResolvedValueOnce([
      makeRow(),
      makeRow({
        id: `entry-2`,
        ledgerEntryId: `entry-2`,
        consumerId: `consumer-2`,
        amount: new Prisma.Decimal(`88.00`),
        currencyCode: `EUR`,
        outcomeStatus: `PENDING`,
        anomalyAt: new Date(`2026-04-04T10:00:00.000Z`),
        outcomeAt: new Date(`2026-04-04T10:00:00.000Z`),
      }),
    ]);

    const result = await service.getList({
      className: `stalePendingEntries`,
      dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
      dateTo: new Date(`2026-04-20T00:00:00.000Z`),
      limit: 1,
    });

    expect(query.listStalePendingEntries).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 1,
        cursor: null,
      }),
      expect.any(Date),
    );
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: `entry-1`,
        amount: `150.5`,
        outcomeStatus: `PROCESSING`,
      }),
    );
    expect(result.items[0].signal.detail).toContain(`threshold 24h`);
    expect(decodeAdminV2Cursor(result.nextCursor ?? undefined)).toEqual({
      createdAt: new Date(`2026-04-04T10:00:00.000Z`),
      id: `entry-2`,
    });
  });

  it(`keeps class-specific detail mapping for duplicate idempotency risk`, async () => {
    const { query, service } = makeService();
    query.listDuplicateIdempotencyRisk.mockResolvedValueOnce([
      makeRow({
        stripeId: `pi_123`,
        outcomeStatus: null,
        outcomeAt: null,
        entryStatus: `COMPLETED`,
      }),
    ]);

    const result = await service.getList({
      className: `duplicateIdempotencyRisk`,
      dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
      dateTo: new Date(`2026-04-20T00:00:00.000Z`),
    });

    expect(result.items[0].signal.detail).toContain(`stripeId pi_123`);
    expect(result.items[0].signal.detail).toContain(`must be idempotent`);
  });

  it(`keeps class-specific detail mapping for impossible transitions`, async () => {
    const { query, service } = makeService();
    query.listImpossibleTransitions.mockResolvedValueOnce([
      makeRow({
        type: `USER_PAYOUT`,
        currencyCode: `GBP`,
        prevStatus: `COMPLETED`,
        nextStatus: `PENDING`,
        outcomeStatus: `PENDING`,
        anomalyAt: new Date(`2026-04-10T12:00:00.000Z`),
        outcomeAt: new Date(`2026-04-10T12:00:00.000Z`),
      }),
    ]);

    const result = await service.getList({
      className: `impossibleTransitions`,
      dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
      dateTo: new Date(`2026-04-20T00:00:00.000Z`),
    });

    expect(result.items[0].signal.detail).toContain(`COMPLETED → PENDING`);
    expect(result.items[0].signal.detail).toContain(`COMPLETED is terminal`);
  });

  it(`rejects list requests without dateFrom`, async () => {
    const { service } = makeService();

    await expect(
      // @ts-expect-error intentionally exercises runtime validation for malformed HTTP-bound params.
      service.getList({ className: `largeValueOutliers` }),
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

    it(`dispatches stale pending count requests to the query`, async () => {
      const { query, service } = makeService();
      query.countStalePendingEntriesForRange.mockResolvedValueOnce(7);

      const result = await service.getCount(`stalePendingEntries`, dateFrom, dateTo);

      expect(result).toBe(7);
      expect(query.countStalePendingEntriesForRange).toHaveBeenCalledWith(
        new Date(dateFrom),
        new Date(dateTo),
        expect.any(Date),
      );
    });

    it(`dispatches impossible-transition counts to the query`, async () => {
      const { query, service } = makeService();
      query.countImpossibleTransitionsForRange.mockResolvedValueOnce(3);

      const result = await service.getCount(`impossibleTransitions`, dateFrom, dateTo);

      expect(result).toBe(3);
      expect(query.countImpossibleTransitionsForRange).toHaveBeenCalledWith(new Date(dateFrom), new Date(dateTo));
    });

    it(`rejects when dateFrom is missing or unparseable`, async () => {
      const { service } = makeService();

      await expect(service.getCount(`stalePendingEntries`, `not-a-date`, dateTo)).rejects.toEqual(
        new BadRequestException(`dateFrom is required`),
      );
    });
  });
});
