import {
  adminV2OperationalAlertsListResponseSchema,
  adminV2OverviewSummaryResponseSchema,
  adminV2QuickstartResolvedPresetSchema,
  adminV2QuickstartsListResponseSchema,
  adminV2SavedViewsListResponseSchema,
  adminV2SystemSummaryResponseSchema,
} from '@remoola/api-types';

import { fetchAdminApi } from './core.server';
import {
  type OperationalAlertWorkspace,
  type OperationalAlertsListResponse,
  type OverviewSummaryResponse,
  type QuickstartCard,
  type QuickstartId,
  type QuickstartResolvedPreset,
  type QuickstartSurface,
  type QuickstartsListResponse,
  type SavedViewWorkspace,
  type SavedViewsListResponse,
  type SystemSummaryResponse,
} from './types';
import { withQuery } from '../query-contract';

export async function getOverviewSummary(): Promise<OverviewSummaryResponse | null> {
  return fetchAdminApi<OverviewSummaryResponse>(`/admin-v2/overview/summary`, adminV2OverviewSummaryResponseSchema);
}

export async function getSystemSummary(): Promise<SystemSummaryResponse | null> {
  return fetchAdminApi<SystemSummaryResponse>(`/admin-v2/system/summary`, adminV2SystemSummaryResponseSchema);
}

export async function getQuickstarts(surface: QuickstartSurface = `all`): Promise<QuickstartCard[]> {
  const response = await fetchAdminApi<QuickstartsListResponse>(
    surface === `all` ? `/admin-v2/quickstarts` : withQuery(`/admin-v2/quickstarts`, { surface }),
    adminV2QuickstartsListResponseSchema,
  );
  return response?.items ?? [];
}

export async function getQuickstart(quickstartId: QuickstartId): Promise<QuickstartResolvedPreset | null> {
  if (!quickstartId.trim()) return null;
  return fetchAdminApi<QuickstartResolvedPreset>(
    `/admin-v2/quickstarts/${quickstartId}`,
    adminV2QuickstartResolvedPresetSchema,
  );
}

export async function getSavedViews(input: { workspace: SavedViewWorkspace }): Promise<SavedViewsListResponse | null> {
  return fetchAdminApi<SavedViewsListResponse>(
    withQuery(`/admin-v2/saved-views`, { workspace: input.workspace }),
    adminV2SavedViewsListResponseSchema,
  );
}

export async function getOperationalAlerts(input: {
  workspace: OperationalAlertWorkspace;
}): Promise<OperationalAlertsListResponse | null> {
  return fetchAdminApi<OperationalAlertsListResponse>(
    withQuery(`/admin-v2/operational-alerts`, { workspace: input.workspace }),
    adminV2OperationalAlertsListResponseSchema,
  );
}
