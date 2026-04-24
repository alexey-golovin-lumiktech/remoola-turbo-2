import { type ReactElement } from 'react';

import { cn } from '@/lib/cn';

export type ChecklistItemProps = {
  icon?: `check` | `dot` | `x`;
  label: string;
  description?: string;
  status?: `ready` | `planned` | `blocked`;
};

const iconClassByStatus: Record<NonNullable<ChecklistItemProps[`status`]>, string> = {
  ready: `bg-emerald-500/20 text-emerald-200`,
  planned: `bg-white/10 text-white/65`,
  blocked: `bg-rose-500/20 text-rose-200`,
};

export function ChecklistItem({
  icon = `check`,
  label,
  description,
  status = `ready`,
}: ChecklistItemProps): ReactElement {
  const glyph = icon === `check` ? `✓` : icon === `x` ? `×` : `•`;

  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className={cn(
          `mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold`,
          iconClassByStatus[status],
        )}
      >
        {glyph}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm text-white/85">{label}</span>
        {description ? <span className="text-xs text-white/55">{description}</span> : null}
      </div>
    </li>
  );
}
