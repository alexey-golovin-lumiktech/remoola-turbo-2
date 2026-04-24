import { type ReactElement } from 'react';

import { cn } from '@remoola/ui';

import { pillBaseClass, toneClassByTone } from './ui-classes';

export type StatusPillTone = `rose` | `amber` | `emerald` | `cyan` | `neutral`;

export type StatusPillProps = {
  status: string | null | undefined;
  toneOverride?: StatusPillTone;
  className?: string;
};

const STATUS_TONE_MAP: Record<string, StatusPillTone> = {
  PENDING: `rose`,
  OVERDUE: `rose`,
  MORE_INFO: `amber`,
  Review: `amber`,
  Unavailable: `amber`,
  VERIFIED: `emerald`,
  SETTLED: `emerald`,
  PROCESSING: `emerald`,
};

function resolveStatusTone(value: string): StatusPillTone {
  return STATUS_TONE_MAP[value] ?? `neutral`;
}

export function StatusPill({ status, toneOverride, className }: StatusPillProps): ReactElement {
  const trimmed = typeof status === `string` ? status.trim() : ``;

  if (!trimmed) {
    return <span className={cn(pillBaseClass, toneClassByTone.neutral, className)}>—</span>;
  }

  const tone = toneOverride ?? resolveStatusTone(trimmed);

  return <span className={cn(pillBaseClass, toneClassByTone[tone], className)}>{trimmed}</span>;
}
