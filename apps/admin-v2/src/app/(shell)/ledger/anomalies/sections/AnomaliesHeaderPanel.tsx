import { Panel } from '../../../../../components/panel';
import { TinyPill } from '../../../../../components/tiny-pill';
import { buttonRowClass } from '../../../../../components/ui-classes';
import {
  type LedgerAnomalyClass,
  type LedgerAnomalyListResponse,
  type LedgerAnomalySummaryResponse,
} from '../../../../../lib/admin-api/types';
import { formatDateTime } from '../../../../../lib/admin-format';
import { LEDGER_ANOMALY_CLASS_LABELS } from '../../../../../lib/admin-surface-meta';

export function AnomaliesHeaderPanel({
  className,
  list,
  summary,
}: {
  className: LedgerAnomalyClass;
  list: LedgerAnomalyListResponse | null;
  summary: LedgerAnomalySummaryResponse | null;
}) {
  return (
    <Panel
      title="Ledger anomalies"
      description="Read-only investigation surface."
      actions={
        <div className={buttonRowClass}>
          <TinyPill tone="cyan">{list?.items.length ?? 0} visible</TinyPill>
          <TinyPill>{LEDGER_ANOMALY_CLASS_LABELS[className]}</TinyPill>
          <TinyPill>Computed {formatDateTime(summary?.computedAt)}</TinyPill>
        </div>
      }
      surface="primary"
    >
      <p className="text-sm leading-6 text-white/62">
        Compare anomaly buckets, tighten the date window and stay inside the current saved-view context while triaging.
      </p>
    </Panel>
  );
}
