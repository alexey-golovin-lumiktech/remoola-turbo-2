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
  return null;
}

function availabilityEyebrow(availability: SignalCardAvailability): string {
  if (availability === `live-actionable`) return `ACTION READY`;
  if (availability === `count-only`) return `READ-ONLY COUNT`;
  if (availability === `deferred`) return `DEFERRED`;
  return `OBSERVED`;
}

function formatStateLabel(value: string | null | undefined): string {
  if (!value) return `—`;
  if (value === `live-actionable`) return `Action ready`;
  if (value === `count-only`) return `Read-only`;
  if (value === `deferred`) return `Deferred`;
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
  const cardClassName = cn(
    panelSurfaceClass,
    `flex flex-col gap-3 p-5 transition`,
    clickable ? `cursor-pointer hover:border-white/20 hover:bg-white/[0.02]` : ``,
    !isLive ? `border-amber-400/20` : ``,
  );
  const pillStatus = isLive ? `PROCESSING` : `Unavailable`;
  const supplemental = availabilityCopy(availability);
  const eyebrow = availabilityEyebrow(availability);

  const body = (
    <article className={cardClassName}>
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] uppercase tracking-[0.18em] text-white/65">
          {eyebrow}
        </span>
        <span className="text-xs text-white/55">{supplemental ?? `Action ready`}</span>
      </div>
      <div className="text-sm text-white/72">{label}</div>
      <div className="text-4xl font-semibold tabular-nums text-white">{count == null ? `—` : String(count)}</div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-white/55">
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
