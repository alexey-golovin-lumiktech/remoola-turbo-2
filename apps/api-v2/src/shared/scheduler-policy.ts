export const SCHEDULER_CRON = {
  adminRefundFinalizationOutbox: `*/5 * * * *`,
  consumerActionLogMaintenance: `17 */6 * * *`,
  consumerActionLogRetention: `23 3 * * *`,
  consumerAutoConversionRules: `*/5 * * * *`,
  consumerScheduledConversions: `*/1 * * * *`,
  oauthStateCleanup: `*/10 * * * *`,
  operationalAlertsEvaluator: `*/5 * * * *`,
  resetPasswordCleanup: `0 */6 * * *`,
  stripeCheckoutReconcile: `* * * * *`,
  stripeReversalReconcile: `*/10 * * * *`,
  verificationSlaRefresh: `*/5 * * * *`,
} as const;

export const SCHEDULER_BATCH_LIMITS = {
  adminRefundFinalizationOutbox: 25,
  operationalAlertsEvaluator: 100,
} as const;

export const SCHEDULER_TIMEOUT_MS = {
  operationalAlertsPerAlert: 10_000,
  operationalAlertsTickWallBudget: 240_000,
} as const;

export type SchedulerRunSummary = {
  event: string;
  processed: number;
  failed: number;
  skipped?: number;
};
