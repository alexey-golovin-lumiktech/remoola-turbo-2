import { ActionGhost } from '../../../../../components/action-ghost';
import { type LedgerAnomalySummaryResponse } from '../../../../../lib/admin-api/types';
import { EMPTY_VALUE } from '../../../../../lib/admin-format';
import { LEDGER_ANOMALY_CLASS_ORDER } from '../../../../../lib/admin-surface-meta';
import { type BuildHrefFn, formatStateLabel } from '../anomalies-shared';

export function AnomaliesSummaryGrid({
  summary,
  buildHref,
}: {
  summary: LedgerAnomalySummaryResponse | null;
  buildHref: BuildHrefFn;
}) {
  return (
    <section className="statsGrid">
      {LEDGER_ANOMALY_CLASS_ORDER.map((key) => {
        const item = summary?.classes[key];
        return (
          <article key={key} className="panel">
            <div className="pageHeader">
              <div>
                <h2>{item?.label ?? key}</h2>
                <p className="muted">State: {formatStateLabel(item?.phaseStatus)}</p>
              </div>
              <ActionGhost href={buildHref({ className: key, cursor: null })}>Open</ActionGhost>
            </div>
            <p className="muted">Availability: {item?.availability ?? `temporarily-unavailable`}</p>
            <p>{item?.count == null ? EMPTY_VALUE : String(item.count)} items</p>
          </article>
        );
      })}
    </section>
  );
}
