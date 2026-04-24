import Link from 'next/link';
import { type ReactElement } from 'react';

import { cn } from '@remoola/ui';

import { NavIcon, type NavIconName } from './nav-icon';
import { TinyPill } from './tiny-pill';
import { isNavItemActive } from '../app/(shell)/nav-state';

type NavTupleItem = {
  href: string;
  label: string;
  workspace: string;
  icon?: NavIconName;
  queueSignalKey?: string;
};

export type SignalCount = { count: number; deferred: boolean };

export type SidebarSectionProps = {
  title: string;
  description?: string;
  items: ReadonlyArray<NavTupleItem>;
  signalCounts?: Record<string, SignalCount>;
  activePath?: string | null;
  compact?: boolean;
  priority?: `core` | `secondary`;
};

export function SidebarSection({
  title,
  description,
  items,
  signalCounts,
  activePath,
  compact = false,
  priority = `secondary`,
}: SidebarSectionProps): ReactElement | null {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="px-2">
      <div
        className={cn(
          `px-2 text-[11px] uppercase tracking-[0.24em] text-white/[0.32]`,
          compact && `text-white/[0.38]`,
          priority === `core` && `text-cyan-200/70`,
        )}
      >
        {title}
      </div>
      {description && !compact ? <p className="mt-1 px-2 text-[11px] leading-5 text-white/45">{description}</p> : null}
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => {
          const sig = item.queueSignalKey && signalCounts ? signalCounts[item.queueSignalKey] : undefined;
          const showSubtitle = !!sig && sig.count > 0 && !sig.deferred;
          const active = isNavItemActive(item.href, activePath);
          return (
            <li key={`${title}-${item.href}-${item.label}`}>
              <Link
                href={item.href}
                aria-current={active ? `page` : undefined}
                title={item.label}
                className={cn(
                  `flex min-h-11 w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition`,
                  compact && `rounded-xl px-3 py-2.5`,
                  active
                    ? `border border-cyan-400/25 bg-cyan-500/10 text-white shadow-xs`
                    : priority === `core`
                      ? `border border-white/6 bg-white/[0.02] text-white/82 hover:border-cyan-400/18 hover:bg-cyan-500/[0.04] hover:text-white`
                      : `border border-transparent text-white/64 hover:border-white/10 hover:bg-white/[0.03] hover:text-white`,
                )}
              >
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center text-sm">
                  {item.icon ? <NavIcon name={item.icon} /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={cn(`block font-medium`, compact && `leading-tight`)}>{item.label}</span>
                    {showSubtitle ? (
                      <TinyPill tone={active ? `cyan` : `neutral`} className="shrink-0">
                        {sig.count}
                      </TinyPill>
                    ) : null}
                  </span>
                  {showSubtitle ? (
                    <span className={cn(`mt-1 block text-xs text-white/40`, compact && `leading-4`)}>
                      {sig.count} pending
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
