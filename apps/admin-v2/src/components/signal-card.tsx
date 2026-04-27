import Link from 'next/link';
import { type ReactElement } from 'react';

import { cn } from '@remoola/ui';

import { StatusPill } from './status-pill';
import { panelSurfaceClass } from './ui-classes';

export type SignalCardAvailability = `available` | `temporarily-unavailable` | string;
export type SignalCardPhaseStatus = `live-actionable` | `count-only` | `deferred` | string;

export type SignalCardProps = {
  label: string;
  count: number | null;
  href: string | null;
  availability: SignalCardAvailability;
  phaseStatus?: SignalCardPhaseStatus | null;
  slaBreachedCount?: number | null;
};

function phaseCopy(phaseStatus: SignalCardPhaseStatus | null | undefined): string | null {
  if (phaseStatus === `count-only`) return `Read-only count`;
  if (phaseStatus === `deferred`) return `Unavailable in current phase`;
  if (phaseStatus === `live-actionable`) return `Live workload`;
  return null;
}

function availabilityCopy(availability: SignalCardAvailability): string | null {
  if (availability === `temporarily-unavailable`) return `Temporary delivery issue`;
  return null;
}

function phaseEyebrow(phaseStatus: SignalCardPhaseStatus | null | undefined): string {
  if (phaseStatus === `live-actionable`) return `LIVE SIGNAL`;
  if (phaseStatus === `count-only`) return `READ-ONLY COUNT`;
  if (phaseStatus === `deferred`) return `DEFERRED`;
  return `OBSERVED`;
}

function availabilityEyebrow(availability: SignalCardAvailability): string | null {
  if (availability === `temporarily-unavailable`) return `TEMPORARILY UNAVAILABLE`;
  return null;
}

function formatStateLabel(value: string | null | undefined): string {
  if (!value) return `—`;
  if (value === `live-actionable`) return `Live queue`;
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
  const isLive = phaseStatus === `live-actionable`;
  const isDeferred = phaseStatus === `deferred`;
  const isUnavailable = availability === `temporarily-unavailable`;
  const clickable = isLive && !isUnavailable && typeof href === `string` && href.length > 0;
  const cardClassName = cn(
    panelSurfaceClass,
    `flex min-h-[196px] flex-col gap-4 p-5 transition`,
    clickable ? `cursor-pointer hover:border-white/20 hover:bg-white/[0.02]` : ``,
    isUnavailable ? `border-amber-400/24` : isLive ? `border-cyan-400/10` : `border-white/10`,
  );
  const pillStatus = isLive ? `PROCESSING` : isUnavailable ? `Unavailable` : `Observed`;
  const supplemental = availabilityCopy(availability) ?? phaseCopy(phaseStatus);
  const eyebrow = availabilityEyebrow(availability) ?? phaseEyebrow(phaseStatus);
  const countValue = isUnavailable ? `Unavailable` : count == null ? `—` : String(count);
  const operatorCopy = isUnavailable
    ? `Signal delivery is degraded right now. Keep the queue visible and avoid interpreting this state as zero workload.`
    : isDeferred
      ? `This signal exists, but it is intentionally hidden in the current workspace phase.`
      : phaseStatus === `count-only`
        ? `This signal stays visible as a reference count, but it does not open an active queue.`
        : label;

  const body = (
    <article className={cardClassName}>
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] uppercase tracking-[0.18em] text-white/65">
          {eyebrow}
        </span>
        <span className="text-xs text-white/55">{supplemental ?? `Live workload`}</span>
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium leading-6 text-white/92">{label}</div>
        <div className="text-xs leading-5 text-white/55">{operatorCopy}</div>
        <div className="text-4xl font-semibold leading-none tabular-nums text-white">{countValue}</div>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-white/55">
        <span className="text-white/55">State: {formatStateLabel(phaseStatus)}</span>
        {isUnavailable ? <span className="text-white/45">Delivery: {formatStateLabel(availability)}</span> : null}
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
