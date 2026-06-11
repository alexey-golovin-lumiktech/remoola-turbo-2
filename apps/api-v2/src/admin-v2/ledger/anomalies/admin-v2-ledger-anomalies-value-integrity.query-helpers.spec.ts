import { describe, expect, it } from '@jest/globals';

import {
  LARGE_VALUE_THRESHOLD_ENTRIES,
  SUMMARY_OUTLIER_WINDOW_DAYS,
  buildDuplicateIdempotencyRiskPredicateSql,
  buildImpossibleTransitionCountLateralSql,
  buildImpossibleTransitionListLateralSql,
  buildLargeValueThresholdLateralSql,
  buildLargeValueThresholdPredicateSql,
  buildOrphanedEntryPredicateSql,
} from './admin-v2-ledger-anomalies-value-integrity.query-helpers';

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

describe(`admin v2 ledger anomalies value integrity query helpers`, () => {
  it(`keeps the 30-day summary outlier window and schema-backed threshold entries`, () => {
    expect(SUMMARY_OUTLIER_WINDOW_DAYS).toBe(30);
    expect(LARGE_VALUE_THRESHOLD_ENTRIES.length).toBeGreaterThan(0);
  });

  it(`builds large-value threshold SQL for both predicate and threshold-map lateral forms`, () => {
    expect(queryToString(buildLargeValueThresholdPredicateSql())).toContain(`ABS(le.amount) >=`);
    const lateralSql = queryToString(buildLargeValueThresholdLateralSql());
    expect(lateralSql).toContain(`threshold_map(currency_code, threshold)`);
    expect(lateralSql).toContain(`WHERE threshold_map.currency_code = le.currency_code::text`);
  });

  it(`keeps orphaned and duplicate-idempotency predicates explicit`, () => {
    expect(queryToString(buildOrphanedEntryPredicateSql())).toContain(`FROM ledger_entry_outcome o`);
    const duplicateSql = queryToString(buildDuplicateIdempotencyRiskPredicateSql());
    expect(duplicateSql).toContain(`le.idempotency_key IS NULL`);
    expect(duplicateSql).toContain(`le.stripe_id IS NOT NULL`);
  });

  it(`builds impossible-transition lateral SQL with terminal-chain and violation ordering semantics`, () => {
    expect(queryToString(buildImpossibleTransitionCountLateralSql())).toContain(`LAG(o.status) OVER`);
    const listSql = queryToString(
      buildImpossibleTransitionListLateralSql(
        new Date(`2026-04-01T00:00:00.000Z`),
        new Date(`2026-04-20T00:00:00.000Z`),
      ),
    );
    expect(listSql).toContain(`chain.prev_status::text IN`);
    expect(listSql).toContain(`ORDER BY chain.violation_at DESC`);
    expect(listSql).toContain(`LIMIT 1`);
  });
});
