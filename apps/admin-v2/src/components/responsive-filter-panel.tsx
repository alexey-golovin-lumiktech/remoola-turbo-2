'use client';

import { useEffect, useState, type ReactElement, type ReactNode } from 'react';

import { cn } from '@remoola/ui';

import { Panel } from './panel';

type ResponsiveFilterPanelProps = {
  title: string;
  description: string;
  summaryLabel: string;
  summaryValue?: string;
  activeCount?: number;
  children: ReactNode;
  className?: string;
};

export function ResponsiveFilterPanel({
  title,
  description,
  summaryLabel,
  summaryValue,
  activeCount = 0,
  children,
  className,
}: ResponsiveFilterPanelProps): ReactElement {
  const [open, setOpen] = useState(false);
  const hasActiveFilters = activeCount > 0;

  useEffect(() => {
    const media = window.matchMedia(`(min-width: 1024px)`);
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
            `flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-card border border-white/8 bg-linear-to-br from-white/[0.04] to-white/[0.02] px-4 py-3 text-left shadow-[0_12px_30px_rgba(2,6,23,0.12)] transition hover:border-white/14 hover:bg-white/[0.03]`,
            hasActiveFilters && `border-cyan-400/20 bg-cyan-500/[0.06]`,
            `lg:hidden`,
          )}
        >
          <span className="min-w-0">
            <span className="block text-sm font-medium text-white/92">{title}</span>
            <span className="mt-1 block text-xs leading-5 text-white/52">{description}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span
              className={cn(
                `rounded-pill border px-2.5 py-1 text-[11px] font-medium`,
                hasActiveFilters
                  ? `border-cyan-400/20 bg-cyan-500/10 text-cyan-100`
                  : `border-white/10 bg-white/[0.03] text-white/72`,
              )}
            >
              {summaryLabel}
            </span>
            {summaryValue ? <span className="text-xs text-white/55">{summaryValue}</span> : null}
            <span className="text-xs text-white/45">{hasActiveFilters ? `Edit filters` : `Show filters`}</span>
            <span
              aria-hidden="true"
              className="text-sm text-white/45 transition group-open:rotate-180 group-open:text-white/70"
            >
              v
            </span>
          </span>
        </summary>
        <div className="lg:pt-0">
          <div className="hidden lg:pb-4 lg:group-open:block">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold text-text">{title}</h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-56">{description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    `rounded-pill border px-2.5 py-1 text-[11px] font-medium`,
                    hasActiveFilters
                      ? `border-cyan-400/20 bg-cyan-500/10 text-cyan-100`
                      : `border-white/10 bg-white/[0.03] text-white/72`,
                  )}
                >
                  {summaryLabel}
                </span>
                {summaryValue ? <span className="text-xs text-white/55">{summaryValue}</span> : null}
              </div>
            </div>
          </div>
          <div className="pt-4 lg:pt-0">{children}</div>
        </div>
      </details>
    </Panel>
  );
}
