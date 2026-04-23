import Link from 'next/link';

import { cn } from '@/lib/cn';

import { NavIcon, type NavIconName } from './nav-icon';
import { isNavItemActive } from '../app/(shell)/nav-state';

import type { ReactElement } from 'react';

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
};

export function SidebarSection({
  title,
  description,
  items,
  signalCounts,
  activePath,
}: SidebarSectionProps): ReactElement | null {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="px-2">
      <div className="px-2 text-[11px] uppercase tracking-[0.24em] text-white/[0.32]">{title}</div>
      {description ? <p className="mt-1 px-2 text-[11px] leading-5 text-white/45">{description}</p> : null}
      <ul className="mt-2 space-y-1">
        {items.map((item) => {
          const sig = item.queueSignalKey && signalCounts ? signalCounts[item.queueSignalKey] : undefined;
          const showSubtitle = !!sig && sig.count > 0 && !sig.deferred;
          const active = isNavItemActive(item.href, activePath);
          return (
            <li key={`${title}-${item.href}-${item.label}`}>
              <Link
                href={item.href}
                aria-current={active ? `page` : undefined}
                className={cn(
                  `navLink`,
                  `flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition`,
                  active
                    ? `border border-cyan-400/20 bg-cyan-500/10 text-white`
                    : `border border-transparent text-white/72 hover:border-white/10 hover:bg-white/[0.03] hover:text-white`,
                )}
              >
                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center text-sm">
                  {item.icon ? <NavIcon name={item.icon} /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{item.label}</span>
                  {showSubtitle ? <span className="mt-1 block text-xs text-white/40">{sig.count} pending</span> : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
