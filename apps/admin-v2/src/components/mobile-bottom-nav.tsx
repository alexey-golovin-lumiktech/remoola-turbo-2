'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactElement } from 'react';

import { cn } from '@remoola/ui';

import { NavIcon } from './nav-icon';
import { isNavItemActive, normalizeActivePath } from '../app/(shell)/nav-state';
import { coreShellItems } from '../app/(shell)/shell-nav';
import { type AdminIdentity } from '../lib/admin-api.server';

type MobileBottomNavProps = {
  identity: AdminIdentity | null;
  activePath?: string | null;
};

export function MobileBottomNav({ identity, activePath }: MobileBottomNavProps): ReactElement | null {
  const pathname = usePathname();

  if (!identity) {
    return null;
  }

  const resolvedActivePath = normalizeActivePath(pathname) ?? activePath ?? null;
  const allowedWorkspaces = new Set(identity.workspaces ?? []);
  const visibleCoreItems = coreShellItems.filter((item) => allowedWorkspaces.has(item.workspace));
  const pinnedItems = visibleCoreItems.slice(0, 4);
  const activeItem = visibleCoreItems.find((item) => isNavItemActive(item.href, resolvedActivePath));

  if (activeItem && !pinnedItems.some((item) => item.href === activeItem.href)) {
    pinnedItems[pinnedItems.length - 1] = activeItem;
  }

  if (pinnedItems.length === 0) {
    return null;
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/92 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pt-2 backdrop-blur-xl md:hidden"
      aria-label="Primary workspaces"
    >
      <div className="grid grid-cols-4 gap-1.5">
        {pinnedItems.map((item) => {
          const active = isNavItemActive(item.href, resolvedActivePath);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? `page` : undefined}
              className={cn(
                `flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border border-transparent px-2 py-2 text-center text-[11px] text-white/62 transition`,
                `hover:-translate-y-px hover:border-white/10 hover:bg-white/[0.03] hover:text-white/85`,
                active && `border-cyan-400/24 bg-cyan-500/10 text-cyan-100 shadow-[0_10px_28px_rgba(8,47,73,0.16)]`,
              )}
            >
              {item.icon ? <NavIcon name={item.icon} /> : null}
              <span className="line-clamp-1 leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
