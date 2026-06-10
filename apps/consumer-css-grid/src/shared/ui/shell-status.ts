export type ShellStatusTone = `success` | `warning` | `danger` | `neutral`;

const SUCCESS_STATUSES: ReadonlySet<string> = new Set([
  `Signed`,
  `Completed`,
  `Connected`,
  `Default`,
  `Ready`,
  `Approved`,
  `Verified`,
  `Executed`,
  `Active`,
  `Confirmed`,
  `Paid`,
  `Settled`,
]);

const WARNING_STATUSES: ReadonlySet<string> = new Set([
  `Pending`,
  `Processing`,
  `Review`,
  `Submitted`,
  `Initiated`,
  `Draft`,
  `Unverified`,
  `Verification in progress`,
  `Verification In Progress`,
  `In review`,
  `In Review`,
  `Awaiting payment`,
  `Awaiting Payment`,
]);

const DANGER_STATUSES: ReadonlySet<string> = new Set([
  `Failed`,
  `Rejected`,
  `Cancelled`,
  `Canceled`,
  `Terminated`,
  `Declined`,
  `Expired`,
  `Reverted`,
  `Verification failed`,
  `Verification Failed`,
  `Rejected by payee`,
  `Rejected By Payee`,
  `Rejected by payer`,
  `Rejected By Payer`,
]);

export function getShellStatusTone(status: string): ShellStatusTone {
  if (SUCCESS_STATUSES.has(status)) {
    return `success`;
  }
  if (WARNING_STATUSES.has(status)) {
    return `warning`;
  }
  if (DANGER_STATUSES.has(status)) {
    return `danger`;
  }
  return `neutral`;
}

export const SHELL_STATUS_TONE_CLASS: Record<ShellStatusTone, string> = {
  success: `border-transparent bg-(--app-success-soft) text-(--app-success-text)`,
  warning: `border-transparent bg-(--app-warning-soft) text-(--app-warning-text)`,
  danger: `border-transparent bg-(--app-danger-soft) text-(--app-danger-text)`,
  neutral: `border-(--app-border) bg-(--app-surface-muted) text-(--app-text-soft)`,
};
