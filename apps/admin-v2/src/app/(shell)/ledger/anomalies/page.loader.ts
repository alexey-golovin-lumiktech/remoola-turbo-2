import { SAVED_VIEW_WORKSPACE } from './anomalies-shared';
import { type LedgerAnomaliesPageParams } from './page.params';
import { type LedgerAnomaliesPagePermissions } from './page.permissions';
import { getLedgerAnomalies, getLedgerAnomaliesSummary } from '../../../../lib/admin-api/ledger.server';
import { getSavedViews } from '../../../../lib/admin-api/overview.server';
import {
  type LedgerAnomalyListResponse,
  type LedgerAnomalySummaryResponse,
  type SavedViewSummary,
} from '../../../../lib/admin-api/types';

export type LedgerAnomaliesPageData = {
  params: LedgerAnomaliesPageParams;
  permissions: LedgerAnomaliesPagePermissions;
  summary: LedgerAnomalySummaryResponse | null;
  list: LedgerAnomalyListResponse | null;
  savedViews: SavedViewSummary[];
};

export async function loadLedgerAnomaliesPage(
  params: LedgerAnomaliesPageParams,
  permissions: LedgerAnomaliesPagePermissions,
): Promise<LedgerAnomaliesPageData> {
  const [summary, list, savedViewsResponse] = await Promise.all([
    getLedgerAnomaliesSummary(),
    getLedgerAnomalies({
      className: params.className,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      cursor: params.cursor,
      limit: 50,
    }),
    permissions.canManageSavedViews ? getSavedViews({ workspace: SAVED_VIEW_WORKSPACE }) : Promise.resolve(null),
  ]);

  const savedViews = savedViewsResponse?.views ?? [];

  return { params, permissions, summary, list, savedViews };
}
