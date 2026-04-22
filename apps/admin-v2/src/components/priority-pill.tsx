import type { StatusPillTone } from './status-pill';
import type { ReactElement } from 'react';

export type PriorityPillProps = {
  priority: `High` | `Medium` | `Low` | string | null | undefined;
  className?: string;
};

function resolvePriorityTone(value: string): StatusPillTone {
  if (value === `High`) return `rose`;
  if (value === `Medium`) return `amber`;
  return `neutral`;
}

export function PriorityPill({ priority, className }: PriorityPillProps): ReactElement {
  const trimmed = typeof priority === `string` ? priority.trim() : ``;
  const composedClassName = className ? `pill ${className}` : `pill`;

  if (!trimmed) {
    return (
      <span className={composedClassName} data-tone="neutral">
        —
      </span>
    );
  }

  const tone = resolvePriorityTone(trimmed);

  return (
    <span className={composedClassName} data-tone={tone}>
      {trimmed}
    </span>
  );
}
