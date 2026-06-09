import { type AdminV2OverviewSignalSummary } from '@remoola/api-types';

import { AUTH_AUDIT_EVENTS } from '../../shared/auth-audit.service';

const LIVE_ACTIONABLE_PHASE_STATUS = `live-actionable` as const;
const DEFAULT_STALE_RATE_HOURS = 24;

type RecentAdminActionRow = {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  createdAt: Date;
  admin: {
    email: string;
  };
};

export function buildAvailableCountSignal(params: {
  label: string;
  href: string;
  count: number;
}): AdminV2OverviewSignalSummary {
  return {
    label: params.label,
    count: params.count,
    phaseStatus: LIVE_ACTIONABLE_PHASE_STATUS,
    availability: `available`,
    href: params.href,
  };
}

export function buildUnavailableCountSignal(params: { label: string; href: string }): AdminV2OverviewSignalSummary {
  return {
    label: params.label,
    count: null,
    phaseStatus: LIVE_ACTIONABLE_PHASE_STATUS,
    availability: `temporarily-unavailable`,
    href: params.href,
  };
}

export function buildLedgerAnomaliesSignal(totalCount: number | null): AdminV2OverviewSignalSummary {
  return {
    label: `Ledger anomalies`,
    count: totalCount,
    phaseStatus: LIVE_ACTIONABLE_PHASE_STATUS,
    availability: totalCount == null ? `temporarily-unavailable` : `available`,
    href: `/ledger/anomalies`,
  };
}

export function buildUnavailableLedgerAnomaliesSignal(): AdminV2OverviewSignalSummary {
  return buildUnavailableCountSignal({
    label: `Ledger anomalies`,
    href: `/ledger/anomalies`,
  });
}

export function buildPendingVerificationsSignal(params: {
  count: number;
  slaBreachedCount: number;
}): AdminV2OverviewSignalSummary & { slaBreachedCount: number } {
  return {
    label: `Pending verifications`,
    count: params.count,
    phaseStatus: LIVE_ACTIONABLE_PHASE_STATUS,
    availability: `available`,
    href: `/verification`,
    slaBreachedCount: params.slaBreachedCount,
  };
}

export function mapRecentAdminActionItem(item: RecentAdminActionRow) {
  return {
    id: item.id,
    action: item.action,
    resource: item.resource,
    resourceId: item.resourceId,
    adminEmail: item.admin.email,
    createdAt: item.createdAt.toISOString(),
  };
}

export function buildRecentAdminActionsSignal(items: RecentAdminActionRow[]) {
  return {
    label: `Recent admin actions`,
    phaseStatus: LIVE_ACTIONABLE_PHASE_STATUS,
    availability: `available` as const,
    href: `/audit/admin-actions`,
    items: items.map((item) => mapRecentAdminActionItem(item)),
  };
}

export function buildSuspiciousAuthEventsSignal(params: {
  count: number;
  authWindowStart: Date;
}): AdminV2OverviewSignalSummary {
  return {
    label: `Suspicious auth events`,
    count: params.count,
    phaseStatus: LIVE_ACTIONABLE_PHASE_STATUS,
    availability: `available`,
    href: `/audit/auth?event=${AUTH_AUDIT_EVENTS.login_failure}&dateFrom=${params.authWindowStart.toISOString()}`,
  };
}

export function buildRateStaleCutoff(now: Date, configuredHours: number) {
  const hours = Number.isFinite(configuredHours) && configuredHours > 0 ? configuredHours : DEFAULT_STALE_RATE_HOURS;
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}
