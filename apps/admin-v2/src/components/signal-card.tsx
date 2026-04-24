import Link from 'next/link';
import { type ReactElement } from 'react';

import { cn } from '@remoola/ui';

import { StatusPill } from './status-pill';
import { panelSurfaceClass } from './ui-classes';

export type SignalCardAvailability = `live-actionable` | `count-only` | `deferred` | string;

export type SignalCardProps = {
  label: string;
  count: number | null;
  href: string | null;
  availability: SignalCardAvailability;
  phaseStatus?: string | null;
  slaBreachedCount?: number | null;
};

function availabilityCopy(availability: SignalCardAvailability): string | null {
  if (availability === `count-only`) return `Read-only count`;
  if (availability === `deferred`) return `Unavailable in current phase`;
  if (availability === `temporarily-unavailable`) return `Temporary delivery issue`;
  return null;
}

function availabilityEyebrow(availability: SignalCardAvailability): string {
  if (availability === `live-actionable`) return `ACTION READY`;
  if (availability === `count-only`) return `READ-ONLY COUNT`;
  if (availability === `deferred`) return `DEFERRED`;
  if (availability === `temporarily-unavailable`) return `TEMPORARILY UNAVAILABLE`;
  return `OBSERVED`;
}

function formatStateLabel(value: string | null | undefined): string {
  if (!value) return `—`;
  if (value === `live-actionable`) return `Action ready`;
  if (value === `count-only`) return `Read-only`;
  if (value === `deferred`) return `Deferred`;
  if (value === `temporarily-unavailable`) return `Temporarily unavailable`;
  return value.replaceAll(`-`, ` `);
}

export function SignalCard({
  label,
  count,
  href,
  availability,
  phaseStatus,
  slaBreachedCount,
}: SignalCardProps): ReactElement {
  const isLive = availability === `live-actionable`;
  const clickable = isLive && typeof href === `string` && href.length > 0;
  const isUnavailable = availability === `temporarily-unavailable` || availability === `deferred`;
  const cardClassName = cn(
    panelSurfaceClass,
    `flex min-h-[196px] flex-col gap-4 p-5 transition`,
    clickable ? `cursor-pointer hover:border-white/20 hover:bg-white/[0.02]` : ``,
    isLive ? `border-cyan-400/10` : isUnavailable ? `border-amber-400/24` : `border-white/10`,
  );
  const pillStatus = isLive ? `PROCESSING` : isUnavailable ? `Unavailable` : `Observed`;
  const supplemental = availabilityCopy(availability);
  const eyebrow = availabilityEyebrow(availability);
  const countValue = availability === `temporarily-unavailable` ? `Unavailable` : count == null ? `—` : String(count);
  const operatorCopy =
    availability === `temporarily-unavailable`
      ? `Signal delivery is degraded right now. Keep the queue visible and avoid interpreting this state as zero workload.`
      : availability === `deferred`
        ? `This signal exists, but it is intentionally hidden in the current workspace phase.`
        : label;

  const body = (
    <article className={cardClassName}>
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] uppercase tracking-[0.18em] text-white/65">
          {eyebrow}
        </span>
        <span className="text-xs text-white/55">{supplemental ?? `Action ready`}</span>
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium leading-6 text-white/92">{label}</div>
        <div className="text-xs leading-5 text-white/55">{operatorCopy}</div>
        <div className="text-4xl font-semibold leading-none tabular-nums text-white">{countValue}</div>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-white/55">
        <span className="text-white/55">State: {formatStateLabel(phaseStatus)}</span>
        <span
          className={
            typeof slaBreachedCount === `number` && slaBreachedCount > 0
              ? `rounded-full border border-rose-400/20 bg-rose-500/15 px-2 py-0.5 text-rose-200`
              : `text-white/45`
          }
        >
          {typeof slaBreachedCount === `number` && slaBreachedCount > 0
            ? `SLA breached: ${String(slaBreachedCount)}`
            : `No SLA issue`}
        </span>
        {isLive ? <StatusPill status={pillStatus} /> : null}
      </div>
    </article>
  );

  if (clickable) {
    return <Link href={href as string}>{body}</Link>;
  }

  return body;
}
