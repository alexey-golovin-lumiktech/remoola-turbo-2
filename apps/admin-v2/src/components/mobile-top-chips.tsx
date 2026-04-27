'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactElement } from 'react';

import { cn } from '@remoola/ui';

import { NavIcon } from './nav-icon';
import { isNavItemActive, normalizeActivePath } from '../app/(shell)/nav-state';
import { financeBreadthItems, laterBreadthItems, maturityItems, topLevelBreadthItems } from '../app/(shell)/shell-nav';
import { type AdminIdentity } from '../lib/admin-api.server';
import { getWorkspaceMeta } from '../lib/workspace-meta';

type MobileTopChipsProps = {
  identity: AdminIdentity | null;
  activePath?: string | null;
};

export function MobileTopChips({ identity, activePath }: MobileTopChipsProps): ReactElement | null {
  const pathname = usePathname();

  if (!identity) {
    return null;
  }

  const resolvedActivePath = normalizeActivePath(pathname) ?? activePath ?? null;
  const workspaceMeta = getWorkspaceMeta(resolvedActivePath);
  const compactChrome = workspaceMeta.mobileChromeMode === `compact`;
  const allowed = new Set(identity.workspaces ?? []);
  const items = [...topLevelBreadthItems, ...financeBreadthItems, ...laterBreadthItems, ...maturityItems].filter(
    (item) => allowed.has(item.workspace),
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      className={cn(
        `sticky top-[calc(env(safe-area-inset-top,0px)+var(--mobile-shell-trigger-height))] z-[34] flex gap-2 overflow-x-auto border-b border-border bg-bg/90 px-4 py-2.5 backdrop-blur-md [scrollbar-width:none] [-ms-overflow-style:none] lg:hidden`,
        compactChrome && `md:gap-1.5 md:py-2`,
        workspaceMeta.hideSupportingChipsOnTablet && `md:hidden`,
      )}
      aria-label="Supporting workspaces"
    >
      <span
        className={cn(
          `inline-flex min-h-11 shrink-0 items-center rounded-pill border border-white/8 bg-white/[0.02] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white/40`,
          compactChrome && `md:min-h-9 md:px-2.5 md:py-1`,
        )}
      >
        Workspaces
      </span>
      {items.map((item) => {
        const isActive = isNavItemActive(item.href, resolvedActivePath);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? `page` : undefined}
            data-active={isActive ? `true` : undefined}
            className={cn(
              `inline-flex min-h-11 shrink-0 items-center gap-2 rounded-pill border border-white/8 bg-white/[0.02] px-3 py-1.5 text-xs text-white/64 transition hover:bg-white/[0.05] hover:text-white/85`,
              compactChrome && `md:min-h-9 md:gap-1.5 md:px-2.5 md:py-1`,
              `data-[active=true]:border-cyan-400/40 data-[active=true]:bg-cyan-500/15 data-[active=true]:text-cyan-100`,
            )}
          >
            {item.icon ? <NavIcon name={item.icon} /> : null}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
