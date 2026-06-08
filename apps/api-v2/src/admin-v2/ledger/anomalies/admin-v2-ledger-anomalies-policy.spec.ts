import { describe, expect, it } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import {
  assertClassName,
  assertDateRange,
  buildAvailableSummary,
  buildDuplicateIdempotencyRiskDetail,
  buildImpossibleTransitionsDetail,
  buildInconsistentChainDetail,
  buildLargeValueDetail,
  buildOrphanedEntryDetail,
  buildStalePendingDetail,
  buildUnavailableSummary,
  mapRowToEntry,
} from './admin-v2-ledger-anomalies-policy';

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

describe(`AdminV2LedgerAnomaliesPolicy`, () => {
  it(`validates anomaly class names`, () => {
    expect(assertClassName(`stalePendingEntries`)).toBe(`stalePendingEntries`);
    expect(() => assertClassName(`unknown-class`)).toThrow(new BadRequestException(`Unknown ledger anomaly class`));
  });

  it(`validates date ranges and falls back dateTo to now`, () => {
    const dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { dateTo } = assertDateRange(dateFrom, undefined);
    expect(dateTo).toBeInstanceOf(Date);

    expect(() => assertDateRange(undefined, undefined)).toThrow(new BadRequestException(`dateFrom is required`));
    expect(() => assertDateRange(new Date(`invalid`), undefined)).toThrow(
      new BadRequestException(`dateFrom is required`),
    );
    expect(() => assertDateRange(new Date(`2026-04-02T00:00:00.000Z`), new Date(`2026-04-01T00:00:00.000Z`))).toThrow(
      new BadRequestException(`dateFrom cannot be after dateTo`),
    );
    expect(() => assertDateRange(new Date(`2026-04-01T00:00:00.000Z`), new Date(`2026-05-02T00:00:00.000Z`))).toThrow(
      new BadRequestException(`range exceeds maximum of 30 days`),
    );
  });

  it(`builds available and unavailable summaries without changing shape`, () => {
    expect(buildAvailableSummary(`stalePendingEntries`, 3)).toEqual({
      label: `Stale pending entries`,
      count: 3,
      phaseStatus: `live-actionable`,
      availability: `available`,
      href: `/ledger/anomalies?class=stalePendingEntries`,
    });

    expect(buildUnavailableSummary(`inconsistentOutcomeChains`)).toEqual({
      label: `Inconsistent outcome chains`,
      count: null,
      phaseStatus: `live-actionable`,
      availability: `temporarily-unavailable`,
      href: `/ledger/anomalies?class=inconsistentOutcomeChains`,
    });
  });

  it(`maps rows to entries with stable serialization`, () => {
    expect(mapRowToEntry(`stalePendingEntries`, makeRow(), new Date(`2026-04-06T10:00:00.000Z`))).toEqual(
      expect.objectContaining({
        id: `entry-1`,
        amount: `150.5`,
        outcomeAt: `2026-04-05T10:00:00.000Z`,
        createdAt: `2026-04-01T09:00:00.000Z`,
        updatedAt: `2026-04-05T10:05:00.000Z`,
        signal: expect.objectContaining({
          class: `stalePendingEntries`,
        }),
      }),
    );
  });

  it(`preserves stale pending and inconsistent chain detail wording`, () => {
    const now = new Date(`2026-04-06T10:00:00.000Z`);
    expect(buildStalePendingDetail(makeRow(), now)).toContain(`threshold 24h`);
    expect(buildInconsistentChainDetail(makeRow(), now)).toContain(`beyond 60m sync window`);
  });

  it(`preserves large value and orphaned detail wording`, () => {
    const now = new Date(`2026-04-06T10:00:00.000Z`);
    expect(buildLargeValueDetail(makeRow({ threshold: 10000 }))).toContain(`threshold 10,000`);
    expect(buildOrphanedEntryDetail(makeRow(), now)).toContain(`grace 1h`);
  });

  it(`preserves duplicate risk and impossible transition wording`, () => {
    const now = new Date(`2026-04-06T10:00:00.000Z`);
    expect(buildDuplicateIdempotencyRiskDetail(makeRow({ stripeId: `pi_123` }))).toContain(`stripeId pi_123`);
    expect(buildDuplicateIdempotencyRiskDetail(makeRow())).toContain(`must be idempotent`);

    expect(
      buildImpossibleTransitionsDetail(
        makeRow({
          prevStatus: `COMPLETED`,
          nextStatus: `PENDING`,
          outcomeStatus: `PENDING`,
          anomalyAt: new Date(`2026-04-05T10:00:00.000Z`),
        }),
        now,
      ),
    ).toContain(`COMPLETED → PENDING`);
  });
});
