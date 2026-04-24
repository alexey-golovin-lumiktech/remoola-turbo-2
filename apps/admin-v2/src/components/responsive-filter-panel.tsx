'use client';

import { useEffect, useState, type ReactElement, type ReactNode } from 'react';

import { cn } from '@remoola/ui';

import { Panel } from './panel';

type ResponsiveFilterPanelProps = {
  title: string;
  description: string;
  summaryLabel: string;
  summaryValue?: string;
  children: ReactNode;
  className?: string;
};

export function ResponsiveFilterPanel({
  title,
  description,
  summaryLabel,
  summaryValue,
  children,
  className,
}: ResponsiveFilterPanelProps): ReactElement {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(`(min-width: 1280px)`);
    const syncFromViewport = (): void => setOpen(media.matches);

    syncFromViewport();
    media.addEventListener(`change`, syncFromViewport);
    return () => media.removeEventListener(`change`, syncFromViewport);
  }, []);

  return (
    <Panel className={className} surface="support">
      <details
        open={open}
        onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
        className="group"
      >
        <summary
          className={cn(
            `flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-card border border-white/8 bg-white/[0.02] px-4 py-3 text-left transition hover:border-white/14 hover:bg-white/[0.03]`,
            `xl:hidden`,
          )}
        >
          <span className="min-w-0">
            <span className="block text-sm font-medium text-white/92">{title}</span>
            <span className="mt-1 block text-xs leading-5 text-white/52">{description}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="rounded-pill border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-100">
              {summaryLabel}
            </span>
            {summaryValue ? <span className="text-xs text-white/55">{summaryValue}</span> : null}
            <span
              aria-hidden="true"
              className="text-sm text-white/45 transition group-open:rotate-180 group-open:text-white/70"
            >
              v
            </span>
          </span>
        </summary>
        <div className="xl:pt-0">
          <div className="hidden xl:pb-4 xl:group-open:block">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold text-text">{title}</h2>
              <p className="max-w-3xl text-sm leading-6 text-muted-56">{description}</p>
            </div>
          </div>
          <div className="pt-4 xl:pt-0">{children}</div>
        </div>
      </details>
    </Panel>
  );
}
