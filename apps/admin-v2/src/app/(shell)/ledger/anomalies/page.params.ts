import { adminV2LedgerAnomaliesListQuerySchema } from '@remoola/api-types';

import { type LedgerAnomalyClass } from '../../../../lib/admin-api/types';
import { getDefaultLookbackDateOnlyRange } from '../../../../lib/admin-format';
import { isLedgerAnomalyClass } from '../../../../lib/admin-surface-meta';
import { buildPathWithSearch } from '../../../../lib/navigation-context';
import { dateSearchParam, type SearchParamValue, trimmedSearchParam } from '../../../../lib/query-contract';

export const SAVED_VIEW_WORKSPACE = `ledger_anomalies` as const;

export type LedgerAnomaliesSavedViewPayload = {
  class: LedgerAnomalyClass;
  dateFrom: string;
  dateTo: string;
};

export type BuildHrefFn = (next: {
  className?: LedgerAnomalyClass;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string | null;
}) => string;

export type LedgerAnomaliesPageParams = {
  className: LedgerAnomalyClass;
  dateFrom: string;
  dateTo: string;
  cursor: string | undefined;
  currentPayload: LedgerAnomaliesSavedViewPayload;
  buildHref: BuildHrefFn;
};

export function parseLedgerAnomaliesSearchParams(
  params: Record<string, SearchParamValue> | undefined,
): LedgerAnomaliesPageParams {
  const defaults = getDefaultLookbackDateOnlyRange();
  const requestedClass = trimmedSearchParam(params?.class);
  const query = adminV2LedgerAnomaliesListQuerySchema.parse({
    class: isLedgerAnomalyClass(requestedClass) ? requestedClass : `stalePendingEntries`,
    dateFrom: dateSearchParam(params?.dateFrom) || defaults.dateFrom,
    dateTo: dateSearchParam(params?.dateTo) || defaults.dateTo,
    cursor: trimmedSearchParam(params?.cursor),
  });
  const className = query.class as LedgerAnomalyClass;
  const dateFrom = query.dateFrom;
  const dateTo = query.dateTo ?? ``;
  const cursor = query.cursor;

  function buildHref(next: {
    className?: LedgerAnomalyClass;
    dateFrom?: string;
    dateTo?: string;
    cursor?: string | null;
  }) {
    return buildPathWithSearch(`/ledger/anomalies`, {
      class: next.className ?? className,
      dateFrom: next.dateFrom ?? dateFrom,
      dateTo: next.dateTo ?? dateTo,
      cursor: next.cursor ?? undefined,
    });
  }

  const currentPayload: LedgerAnomaliesSavedViewPayload = { class: className, dateFrom, dateTo };

  return {
    className,
    dateFrom,
    dateTo,
    cursor,
    currentPayload,
    buildHref,
  };
}
