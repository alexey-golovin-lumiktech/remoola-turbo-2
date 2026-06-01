import { ActionGhost } from '../../../../../components/action-ghost';
import { Panel } from '../../../../../components/panel';
import { fieldClass, fieldLabelClass, textInputClass } from '../../../../../components/ui-classes';
import { type LedgerAnomalyClass } from '../../../../../lib/admin-api/types';
import { type BuildHrefFn, defaultDateRange } from '../anomalies-shared';

export function AnomaliesFilters({
  className,
  dateFrom,
  dateTo,
  buildHref,
}: {
  className: LedgerAnomalyClass;
  dateFrom: string;
  dateTo: string;
  buildHref: BuildHrefFn;
}) {
  const defaults = defaultDateRange();
  return (
    <Panel
      title="Time window"
      description="Keep the class fixed and tighten the anomaly window only when needed for review."
    >
      <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" method="get">
        <input type="hidden" name="class" value={className} />
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Date from</span>
          <input className={textInputClass} name="dateFrom" type="date" defaultValue={dateFrom} />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Date to</span>
          <input className={textInputClass} name="dateTo" type="date" defaultValue={dateTo} />
        </label>
        <div className="flex items-end gap-2 xl:col-span-2">
          <ActionGhost type="submit">Apply</ActionGhost>
          <ActionGhost
            href={buildHref({ className, dateFrom: defaults.dateFrom, dateTo: defaults.dateTo, cursor: null })}
          >
            Reset
          </ActionGhost>
        </div>
      </form>
    </Panel>
  );
}
