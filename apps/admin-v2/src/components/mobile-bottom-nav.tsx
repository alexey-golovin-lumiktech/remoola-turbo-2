import Link from 'next/link';
import { type CSSProperties, type ReactElement } from 'react';

import { cn } from '@/lib/cn';

import { NavIcon } from './nav-icon';
import { isNavItemActive } from '../app/(shell)/nav-state';
import { coreShellItems } from '../app/(shell)/shell-nav';
import { type AdminIdentity } from '../lib/admin-api.server';

type MobileBottomNavProps = {
  identity: AdminIdentity | null;
  activePath?: string | null;
};

export function MobileBottomNav({ identity, activePath }: MobileBottomNavProps): ReactElement | null {
  if (!identity) {
    return null;
  }

  const allowed = new Set(identity.workspaces ?? []);
  const items = coreShellItems.filter((item) => allowed.has(item.workspace));

  if (items.length === 0) {
    return null;
  }

  const navStyle = {
    [`--mobile-bottom-nav-count` as keyof CSSProperties]: items.length,
  } as CSSProperties;

  return (
    <nav
      className={cn(
        `mobileBottomNav`,
        `fixed bottom-0 inset-x-0 z-40 grid border-t border-border bg-bg/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]`,
      )}
      aria-label="Core workspaces"
      style={navStyle}
    >
      {items.map((item) => {
        const isActive = isNavItemActive(item.href, activePath) ? `true` : undefined;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            title={item.label}
            className={cn(
              `bottomNavLink`,
              `flex flex-col items-center gap-1 py-2 text-xs text-white/55 transition data-[active=true]:bg-cyan-500/10 data-[active=true]:text-cyan-100 hover:text-white/85`,
            )}
            data-active={isActive}
          >
            {item.icon ? <NavIcon name={item.icon} /> : null}
            <span className={cn(`bottomNavLabel`, `text-[11px] leading-none`)}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
