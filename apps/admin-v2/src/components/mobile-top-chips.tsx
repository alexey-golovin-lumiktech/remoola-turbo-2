import Link from 'next/link';
import { type ReactElement } from 'react';

import { cn } from '@/lib/cn';

import { NavIcon } from './nav-icon';
import { isNavItemActive } from '../app/(shell)/nav-state';
import { laterBreadthItems, maturityItems, topLevelBreadthItems } from '../app/(shell)/shell-nav';
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
  const items = [...topLevelBreadthItems, ...laterBreadthItems, ...maturityItems].filter((item) =>
    allowed.has(item.workspace),
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      className={cn(
        `mobileTopChips`,
        `flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [-ms-overflow-style:none]`,
      )}
      aria-label="Secondary workspaces"
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
              `chip`,
              `inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/72 transition hover:bg-white/[0.06] hover:text-white/90`,
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
