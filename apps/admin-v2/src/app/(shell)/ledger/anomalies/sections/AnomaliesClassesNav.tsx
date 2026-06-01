import Link from 'next/link';

import { Panel } from '../../../../../components/panel';
import { buttonRowClass } from '../../../../../components/ui-classes';
import { type LedgerAnomalyClass } from '../../../../../lib/admin-api/types';
import { LEDGER_ANOMALY_CLASS_LABELS, LEDGER_ANOMALY_CLASS_ORDER } from '../../../../../lib/admin-surface-meta';
import { type BuildHrefFn } from '../anomalies-shared';

export function AnomaliesClassesNav({
  className,
  buildHref,
}: {
  className: LedgerAnomalyClass;
  buildHref: BuildHrefFn;
}) {
  return (
    <Panel
      title="Anomaly classes"
      description="Jump between anomaly buckets without leaving the saved-view context."
      surface="support"
    >
      <nav className={buttonRowClass} aria-label="Anomaly classes">
        {LEDGER_ANOMALY_CLASS_ORDER.map((key) => (
          <Link
            key={key}
            href={buildHref({ className: key, cursor: null })}
            aria-current={key === className ? `page` : undefined}
            className={key === className ? `secondaryButton` : `secondaryButton`}
          >
            {LEDGER_ANOMALY_CLASS_LABELS[key]}
          </Link>
        ))}
      </nav>
    </Panel>
  );
}
