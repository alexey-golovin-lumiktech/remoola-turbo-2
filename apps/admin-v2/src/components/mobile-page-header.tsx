'use client';

import { usePathname } from 'next/navigation';
import { type ReactElement } from 'react';

import { cn } from '@remoola/ui';

import { normalizeActivePath } from '../app/(shell)/nav-state';
import { getWorkspaceMeta } from '../lib/workspace-meta';
import { readCurrentWorkspaceSignalCount, type SignalCount } from '../lib/workspace-signal';

type MobilePageHeaderProps = {
  activePath?: string | null;
  signalCounts?: Record<string, SignalCount>;
  liveCount?: number | null;
};

export function MobilePageHeader({
  activePath = null,
  signalCounts = {},
  liveCount = null,
}: MobilePageHeaderProps): ReactElement {
  const pathname = usePathname();
  const resolvedActivePath = normalizeActivePath(pathname) ?? activePath;
  const workspaceMeta = getWorkspaceMeta(resolvedActivePath);
  const compactChrome = workspaceMeta.mobileChromeMode === `compact`;
  const derivedLiveCount = readCurrentWorkspaceSignalCount(resolvedActivePath, signalCounts);
  const countValue = typeof derivedLiveCount === `number` ? derivedLiveCount : liveCount;
  const countLabel = typeof countValue === `number` ? String(countValue) : `—`;

  return (
    <div
      className={cn(
        `mx-4 mt-1 rounded-card border border-white/8 bg-linear-to-br from-white/[0.04] to-white/[0.02] px-4 py-3 shadow-[0_12px_30px_rgba(2,6,23,0.16)] lg:hidden`,
        compactChrome && `md:py-2.5`,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">
            {workspaceMeta.eyebrow}
          </div>
          <div className="mt-1 text-lg font-semibold text-white/95">{workspaceMeta.title}</div>
          <div className={cn(`mt-1 text-xs text-white/52`, compactChrome && `md:hidden`)}>
            {workspaceMeta.queueIntent}
          </div>
        </div>
        <div className="rounded-pill border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-100">
          {countLabel}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/52">
        <span className="font-medium text-white/68">Live queue</span>
        <span>{workspaceMeta.queueLabel}</span>
      </div>
    </div>
  );
}
