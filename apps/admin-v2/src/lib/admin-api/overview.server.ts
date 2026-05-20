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

export async function getOverviewSummary(): Promise<OverviewSummaryResponse | null> {
  return fetchAdminApi<OverviewSummaryResponse>(`/admin-v2/overview/summary`);
}

export async function getSystemSummary(): Promise<SystemSummaryResponse | null> {
  return fetchAdminApi<SystemSummaryResponse>(`/admin-v2/system/summary`);
}

export async function getQuickstarts(surface: QuickstartSurface = `all`): Promise<QuickstartCard[]> {
  const searchParams = new URLSearchParams();
  if (surface !== `all`) {
    searchParams.set(`surface`, surface);
  }
  const query = searchParams.toString();
  const response = await fetchAdminApi<QuickstartsListResponse>(
    query ? `/admin-v2/quickstarts?${query}` : `/admin-v2/quickstarts`,
  );
  return response?.items ?? [];
}

export async function getQuickstart(quickstartId: QuickstartId): Promise<QuickstartResolvedPreset | null> {
  if (!quickstartId.trim()) return null;
  return fetchAdminApi<QuickstartResolvedPreset>(`/admin-v2/quickstarts/${quickstartId}`);
}

export async function getSavedViews(input: { workspace: SavedViewWorkspace }): Promise<SavedViewsListResponse | null> {
  const searchParams = new URLSearchParams({ workspace: input.workspace });
  return fetchAdminApi<SavedViewsListResponse>(`/admin-v2/saved-views?${searchParams.toString()}`);
}

export async function getOperationalAlerts(input: {
  workspace: OperationalAlertWorkspace;
}): Promise<OperationalAlertsListResponse | null> {
  const searchParams = new URLSearchParams({ workspace: input.workspace });
  return fetchAdminApi<OperationalAlertsListResponse>(`/admin-v2/operational-alerts?${searchParams.toString()}`);
}
