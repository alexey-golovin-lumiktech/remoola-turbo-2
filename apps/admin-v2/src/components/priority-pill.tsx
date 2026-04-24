import { type ReactElement } from 'react';

import { cn } from '@remoola/ui';

import { type StatusPillTone } from './status-pill';
import { pillBaseClass, toneClassByTone } from './ui-classes';

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

  if (!trimmed) {
    return <span className={cn(pillBaseClass, toneClassByTone.neutral, className)}>—</span>;
  }

  const tone = resolvePriorityTone(trimmed);

  return <span className={cn(pillBaseClass, toneClassByTone[tone], className)}>{trimmed}</span>;
}
