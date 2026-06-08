export type ShellStatusTone = `success` | `warning` | `neutral`;

const SUCCESS_STATUSES: ReadonlySet<string> = new Set([`Signed`, `Completed`, `Connected`, `Default`, `Ready`]);
const WARNING_STATUSES: ReadonlySet<string> = new Set([`Pending`, `Processing`, `Review`]);

export function getShellStatusTone(status: string): ShellStatusTone {
  if (SUCCESS_STATUSES.has(status)) {
    return `success`;
  }
  if (WARNING_STATUSES.has(status)) {
    return `warning`;
  }
  return `neutral`;
}

export const SHELL_STATUS_TONE_CLASS: Record<ShellStatusTone, string> = {
  success: `border-transparent bg-(--app-success-soft) text-(--app-success-text)`,
  warning: `border-transparent bg-(--app-warning-soft) text-(--app-warning-text)`,
  neutral: `border-(--app-border) bg-(--app-surface-muted) text-(--app-text-soft)`,
};
