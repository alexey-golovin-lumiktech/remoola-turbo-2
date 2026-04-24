import { headers } from 'next/headers';
import Link from 'next/link';
import { type ReactElement, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { getActivePathFromHeaders, isNavItemActive } from '../nav-state';

const AUDIT_TABS: ReadonlyArray<{ href: string; label: string; eyebrow: string }> = [
  { href: `/audit/auth`, label: `Auth events`, eyebrow: `AUTH` },
  { href: `/audit/admin-actions`, label: `Admin actions`, eyebrow: `ACTIONS` },
  { href: `/audit/consumer-actions`, label: `Consumer actions`, eyebrow: `CONSUMER` },
];

type AuditLayoutProps = {
  children: ReactNode;
};

export default async function AuditLayout({ children }: AuditLayoutProps): Promise<ReactElement> {
  const headerStore = await headers();
  const activePath = getActivePathFromHeaders(headerStore);

  return (
    <div className={cn(`flex flex-col gap-6`)}>
      <nav
        role="tablist"
        aria-label="Audit explorer"
        className={cn(
          `sticky top-0 z-10 -mx-4 flex gap-2 overflow-x-auto border-b border-border bg-bg/85 px-4 py-3 backdrop-blur-md`,
          `md:mx-0 md:rounded-card md:border md:bg-panel md:px-3`,
          `xl:top-24`,
        )}
      >
        {AUDIT_TABS.map((tab) => {
          const isActive = isNavItemActive(tab.href, activePath);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              role="tab"
              aria-current={isActive ? `page` : undefined}
              data-active={isActive ? `true` : `false`}
              className={cn(
                `inline-flex shrink-0 items-center gap-2 rounded-pill border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white/72 transition`,
                `hover:border-white/20 hover:text-white/95`,
                `data-[active=true]:border-cyan-400/40 data-[active=true]:bg-cyan-500/15 data-[active=true]:text-cyan-100`,
              )}
            >
              <span
                data-active={isActive ? `true` : `false`}
                className={cn(
                  `text-[10px] font-medium uppercase tracking-[0.16em] text-white/45`,
                  `data-[active=true]:text-cyan-200/80`,
                )}
              >
                {tab.eyebrow}
              </span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
      <div>{children}</div>
    </div>
  );
}
