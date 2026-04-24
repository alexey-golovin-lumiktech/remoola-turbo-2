import Link from 'next/link';
import { type ReactElement } from 'react';

import { cn } from '@remoola/ui';

import { NavIcon } from './nav-icon';
import { isNavItemActive } from '../app/(shell)/nav-state';
import { financeBreadthItems, laterBreadthItems, maturityItems, topLevelBreadthItems } from '../app/(shell)/shell-nav';
import { type AdminIdentity } from '../lib/admin-api.server';

type MobileTopChipsProps = {
  identity: AdminIdentity | null;
  activePath?: string | null;
};

export function MobileTopChips({ identity, activePath }: MobileTopChipsProps): ReactElement | null {
  if (!identity) {
    return null;
  }

  const allowed = new Set(identity.workspaces ?? []);
  const items = [...topLevelBreadthItems, ...financeBreadthItems, ...laterBreadthItems, ...maturityItems].filter(
    (item) => allowed.has(item.workspace),
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      className="sticky top-[calc(env(safe-area-inset-top,0px)+var(--mobile-shell-trigger-height))] z-[34] flex gap-2 overflow-x-auto border-b border-border bg-bg/90 px-4 py-2.5 backdrop-blur-md [scrollbar-width:none] [-ms-overflow-style:none] lg:hidden"
      aria-label="Supporting workspaces"
    >
      {items.map((item) => {
        const isActive = isNavItemActive(item.href, activePath);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? `page` : undefined}
            data-active={isActive ? `true` : undefined}
            className={cn(
              `inline-flex min-h-11 shrink-0 items-center gap-2 rounded-pill border border-white/8 bg-white/[0.02] px-3 py-1.5 text-xs text-white/64 transition hover:bg-white/[0.05] hover:text-white/85`,
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
