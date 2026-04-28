export type AdminV2SystemSummaryCard = {
  label: string;
  status: `healthy` | `watch` | `temporarily-unavailable`;
  explanation: string;
  facts: Array<{
    label: string;
    value: string | number | null;
  }>;
  primaryAction: {
    label: string;
    href: string;
  } | null;
  escalationHint: string | null;
};

export type AdminV2SystemSummaryResponse = {
  computedAt: string;
  cards: {
    stripeWebhookHealth: AdminV2SystemSummaryCard;
    schedulerHealth: AdminV2SystemSummaryCard;
    ledgerAnomalies: AdminV2SystemSummaryCard;
    emailDeliveryIssuePatterns: AdminV2SystemSummaryCard;
    staleExchangeRateAlerts: AdminV2SystemSummaryCard;
  };
};
