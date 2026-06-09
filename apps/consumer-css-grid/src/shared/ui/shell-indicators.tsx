import { type ReactNode } from 'react';

import { SHELL_STATUS_TONE_CLASS, getShellStatusTone } from './shell-status';

type StatusPillStatus =
  | `Signed`
  | `Completed`
  | `Connected`
  | `Default`
  | `Ready`
  | `Pending`
  | `Processing`
  | `Review`
  | string;

export function StatusPill({ status }: { status: StatusPillStatus }) {
  const tone = SHELL_STATUS_TONE_CLASS[getShellStatusTone(status)];

  return <span className={`rounded-full border px-3 py-1 text-xs ${tone}`}>{status}</span>;
}

export function ChecklistItem({ checked, children }: { checked?: boolean; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-(--app-text-soft)">
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-[4px] border text-[10px] ${
          checked
            ? `border-(--app-primary) bg-(--app-primary-soft) text-(--app-primary)`
            : `border-(--app-border) text-transparent`
        }`}
      >
        ✓
      </span>
      <span className={checked ? `line-through text-(--app-text-faint)` : ``}>{children}</span>
    </div>
  );
}
