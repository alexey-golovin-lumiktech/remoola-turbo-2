import { headers } from 'next/headers';
import Link from 'next/link';
import { type ReactElement, type ReactNode } from 'react';

import { cn } from '@remoola/ui';

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
  const activeTab = AUDIT_TABS.find((tab) => isNavItemActive(tab.href, activePath)) ??
    AUDIT_TABS[0] ?? { label: `Audit explorer` };

  return (
    <div className={cn(`flex flex-col gap-6`)}>
      <div className={cn(`sticky top-2 z-10 -mx-4 px-4`, `md:mx-0 md:px-0`, `xl:top-24`)}>
        <div className="rounded-card border border-white/10 bg-bg/90 px-3 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-md md:bg-panel">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/45">Audit explorer</p>
              <p className="truncate text-sm text-white/72">{activeTab.label}</p>
            </div>
            <p className="text-xs text-white/45 md:hidden">Swipe tabs</p>
          </div>
          <nav role="tablist" aria-label="Audit explorer" className="flex gap-2 overflow-x-auto pb-1">
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
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}
