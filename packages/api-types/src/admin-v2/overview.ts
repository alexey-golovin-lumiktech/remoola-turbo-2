export type AdminV2SignalPhaseStatus = `live-actionable` | `count-only` | `deferred`;
export type AdminV2SignalAvailability = `available` | `temporarily-unavailable`;

export type AdminV2OverviewSignalSummary = {
  label: string;
  phaseStatus: AdminV2SignalPhaseStatus;
  availability: AdminV2SignalAvailability;
  href: string | null;
  count?: number | null;
  slaBreachedCount?: number | null;
  items?: Array<Record<string, unknown>>;
};

export type AdminV2OverviewSummaryResponse = {
  computedAt: string;
  signals: Record<string, AdminV2OverviewSignalSummary>;
};
