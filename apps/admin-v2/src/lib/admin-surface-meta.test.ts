import { describe, expect, it } from '@jest/globals';

import {
  isLedgerAnomalyClass,
  LEDGER_ANOMALY_CLASS_LABELS,
  LEDGER_ANOMALY_CLASS_ORDER,
  OPERATIONAL_ALERT_WORKSPACE_META,
  OPERATIONAL_ALERT_WORKSPACE_ORDER,
  SAVED_VIEW_WORKSPACE_PATHS,
} from './admin-surface-meta';

describe(`admin surface metadata`, () => {
  it(`keeps every ledger anomaly class label in the shared catalog order`, () => {
    expect(LEDGER_ANOMALY_CLASS_ORDER).toEqual([
      `stalePendingEntries`,
      `inconsistentOutcomeChains`,
      `largeValueOutliers`,
      `orphanedEntries`,
      `duplicateIdempotencyRisk`,
      `impossibleTransitions`,
    ]);

    expect(LEDGER_ANOMALY_CLASS_ORDER.map((key) => LEDGER_ANOMALY_CLASS_LABELS[key])).toEqual([
      `Stale pending entries`,
      `Inconsistent outcome chains`,
      `Large value outliers`,
      `Orphaned entries`,
      `Duplicate idempotency risk`,
      `Impossible transitions`,
    ]);
  });

  it(`accepts only known anomaly classes`, () => {
    expect(isLedgerAnomalyClass(`stalePendingEntries`)).toBe(true);
    expect(isLedgerAnomalyClass(`legacyClass`)).toBe(false);
    expect(isLedgerAnomalyClass(null)).toBe(false);
  });

  it(`keeps saved view workspace paths typed and complete`, () => {
    expect(SAVED_VIEW_WORKSPACE_PATHS).toEqual({
      ledger_anomalies: `/ledger/anomalies`,
      verification_queue: `/verification`,
    });
  });

  it(`keeps operational alert workspace metadata aligned with the supported order`, () => {
    expect(
      OPERATIONAL_ALERT_WORKSPACE_ORDER.map((workspace) => OPERATIONAL_ALERT_WORKSPACE_META[workspace].sectionTitle),
    ).toEqual([`Ledger anomalies alerts`, `Verification queue alerts`, `Auth refresh reuse alerts`]);
  });
});
