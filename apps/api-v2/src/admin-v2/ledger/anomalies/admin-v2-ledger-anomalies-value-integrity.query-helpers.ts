import { type $Enums, Prisma } from '@remoola/database-2';

import { LARGE_VALUE_THRESHOLDS, TERMINAL_OUTCOME_STATUSES } from './admin-v2-ledger-anomalies.dto';
import { sqlInList } from '../../../shared/prisma-raw.utils';

export const SUMMARY_OUTLIER_WINDOW_DAYS = 30;
export const LARGE_VALUE_THRESHOLD_ENTRIES = Object.entries(LARGE_VALUE_THRESHOLDS) as Array<
  [$Enums.CurrencyCode, number]
>;

export type CountRow = {
  count: number;
};

export function buildLargeValueThresholdPredicateSql() {
  return Prisma.join(
    LARGE_VALUE_THRESHOLD_ENTRIES.map(
      ([currencyCode, threshold]) =>
        Prisma.sql`(le.currency_code::text = ${currencyCode} AND ABS(le.amount) >= ${threshold})`,
    ),
    ` OR `,
  );
}

export function buildLargeValueThresholdLateralSql() {
  return Prisma.sql`
    JOIN LATERAL (
      SELECT threshold
      FROM (
        VALUES ${Prisma.join(
          LARGE_VALUE_THRESHOLD_ENTRIES.map(([currencyCode, threshold]) => Prisma.sql`(${currencyCode}, ${threshold})`),
          `, `,
        )}
      ) AS threshold_map(currency_code, threshold)
      WHERE threshold_map.currency_code = le.currency_code::text
    ) thresholds ON true
  `;
}

export function buildOrphanedEntryPredicateSql() {
  return Prisma.sql`
    AND NOT EXISTS (
      SELECT 1
      FROM ledger_entry_outcome o
      WHERE o.ledger_entry_id = le.id
    )
  `;
}

export function buildDuplicateIdempotencyRiskPredicateSql() {
  return Prisma.sql`
    AND le.idempotency_key IS NULL
    AND le.stripe_id IS NOT NULL
  `;
}

export function buildImpossibleTransitionCountLateralSql() {
  return Prisma.sql`
    JOIN LATERAL (
      SELECT 1
      FROM (
        SELECT
          o.status,
          LAG(o.status) OVER (ORDER BY o.created_at, o.id) AS prev_status
        FROM ledger_entry_outcome o
        WHERE o.ledger_entry_id = le.id
      ) chain
      WHERE chain.prev_status::text IN (${sqlInList(TERMINAL_OUTCOME_STATUSES)})
      LIMIT 1
    ) violation ON true
  `;
}

export function buildImpossibleTransitionRangeCountLateralSql(dateFrom: Date, dateTo: Date) {
  return Prisma.sql`
    JOIN LATERAL (
      SELECT 1
      FROM (
        SELECT
          o.status AS next_status,
          o.created_at AS violation_at,
          LAG(o.status) OVER (ORDER BY o.created_at, o.id) AS prev_status
        FROM ledger_entry_outcome o
        WHERE o.ledger_entry_id = le.id
      ) chain
      WHERE chain.prev_status::text IN (${sqlInList(TERMINAL_OUTCOME_STATUSES)})
        AND chain.violation_at >= ${dateFrom}
        AND chain.violation_at <= ${dateTo}
      LIMIT 1
    ) violation ON true
  `;
}

export function buildImpossibleTransitionListLateralSql(dateFrom: Date, dateTo: Date) {
  return Prisma.sql`
    JOIN LATERAL (
      SELECT
        chain.prev_status,
        chain.next_status,
        chain.violation_at
      FROM (
        SELECT
          o.status AS next_status,
          o.created_at AS violation_at,
          LAG(o.status) OVER (ORDER BY o.created_at, o.id) AS prev_status
        FROM ledger_entry_outcome o
        WHERE o.ledger_entry_id = le.id
      ) chain
      WHERE chain.prev_status::text IN (${sqlInList(TERMINAL_OUTCOME_STATUSES)})
        AND chain.violation_at >= ${dateFrom}
        AND chain.violation_at <= ${dateTo}
      ORDER BY chain.violation_at DESC
      LIMIT 1
    ) violation ON true
  `;
}
