import { type ReactElement } from 'react';

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
  const composedClassName = className ? `pill ${className}` : `pill`;

  if (!trimmed) {
    return (
      <span className={composedClassName} data-tone="neutral">
        —
      </span>
    );
  }

  const tone = toneOverride ?? resolveStatusTone(trimmed);

  return (
    <span className={composedClassName} data-tone={tone}>
      {trimmed}
    </span>
  );
}
