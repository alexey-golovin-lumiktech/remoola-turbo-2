import { type LedgerAnomalyClass, type OperationalAlertWorkspace, type SavedViewWorkspace } from './admin-api.server';

export const SHARED_NAME_MAX_LENGTH = 100;
export const SHARED_DESCRIPTION_MAX_LENGTH = 500;

export const LEDGER_ANOMALY_CLASS_ORDER = [
  `stalePendingEntries`,
  `inconsistentOutcomeChains`,
  `largeValueOutliers`,
  `orphanedEntries`,
  `duplicateIdempotencyRisk`,
  `impossibleTransitions`,
] as const satisfies readonly LedgerAnomalyClass[];

export const LEDGER_ANOMALY_CLASS_LABELS: Record<LedgerAnomalyClass, string> = {
  stalePendingEntries: `Stale pending entries`,
  inconsistentOutcomeChains: `Inconsistent outcome chains`,
  largeValueOutliers: `Large value outliers`,
  orphanedEntries: `Orphaned entries`,
  duplicateIdempotencyRisk: `Duplicate idempotency risk`,
  impossibleTransitions: `Impossible transitions`,
};

export function isLedgerAnomalyClass(value: unknown): value is LedgerAnomalyClass {
  return typeof value === `string` && LEDGER_ANOMALY_CLASS_ORDER.includes(value as LedgerAnomalyClass);
}

export const SAVED_VIEW_WORKSPACE_PATHS: Record<SavedViewWorkspace, string> = {
  ledger_anomalies: `/ledger/anomalies`,
  verification_queue: `/verification`,
};

type OperationalAlertWorkspaceMeta = {
  sectionTitle: string;
  sectionCaption: string;
  createTitle: string;
  namePlaceholder: string;
};

export const OPERATIONAL_ALERT_WORKSPACE_ORDER = [
  `ledger_anomalies`,
  `verification_queue`,
  `auth_refresh_reuse`,
] as const satisfies readonly OperationalAlertWorkspace[];

export const OPERATIONAL_ALERT_WORKSPACE_META: Record<OperationalAlertWorkspace, OperationalAlertWorkspaceMeta> = {
  ledger_anomalies: {
    sectionTitle: `Ledger anomalies alerts`,
    sectionCaption: `Threshold-based monitoring on ledger anomaly counts.`,
    createTitle: `New ledger anomalies alert`,
    namePlaceholder: `e.g. Stale pending entries spike`,
  },
  verification_queue: {
    sectionTitle: `Verification queue alerts`,
    sectionCaption: `Threshold-based monitoring on verification queue size (filtered or total).`,
    createTitle: `New verification queue alert`,
    namePlaceholder: `e.g. Verification queue backlog`,
  },
  auth_refresh_reuse: {
    sectionTitle: `Auth refresh reuse alerts`,
    sectionCaption: `Threshold-based monitoring on admin refresh-token reuse detections.`,
    createTitle: `New auth refresh reuse alert`,
    namePlaceholder: `e.g. Refresh reuse spike`,
  },
};
