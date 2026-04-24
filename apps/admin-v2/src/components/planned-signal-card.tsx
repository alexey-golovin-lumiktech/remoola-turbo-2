import { type ReactElement } from 'react';

import { cn } from '@remoola/ui';

import { panelSurfaceClass } from './ui-classes';

export type PlannedSignalCardProps = {
  label: string;
  eyebrow?: string;
  description?: string;
};

export function PlannedSignalCard({
  label,
  eyebrow = `PLANNED · NOT YET WIRED`,
  description,
}: PlannedSignalCardProps): ReactElement {
  return (
    <article
      className={cn(
        panelSurfaceClass,
        `flex flex-col gap-3 border-dashed border-white/10 bg-white/[0.02] p-5 opacity-75`,
      )}
    >
      <span className="inline-flex w-fit rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] uppercase tracking-[0.18em] text-white/55">
        {eyebrow}
      </span>
      <div className="text-sm text-white/72">{label}</div>
      {description ? <div className="text-xs text-white/55">{description}</div> : null}
    </article>
  );
}
