import { headers } from 'next/headers';
import { type ReactElement } from 'react';

import { cn } from '@remoola/ui';

import { ShellQuickActions } from './shell-quick-actions';
import { ShellSearchForm } from './shell-search-form';
import { panelPrimaryClass, panelSurfaceClass } from './ui-classes';
import { getActivePathFromHeaders } from '../app/(shell)/nav-state';
import { getWorkspaceMeta } from '../lib/workspace-meta';

async function safeGetActivePath(): Promise<string | null> {
  try {
    const headerStore = await headers();
    return getActivePathFromHeaders(headerStore);
  } catch {
    return null;
  }
}

export async function ShellHeader(): Promise<ReactElement> {
  const path = await safeGetActivePath();
  const workspaceMeta = getWorkspaceMeta(path);

  return (
    <header
      className={cn(
        panelSurfaceClass,
        panelPrimaryClass,
        `sticky top-0 z-30 hidden border-border/90 bg-bg/86 px-5 py-4 backdrop-blur-xl lg:block xl:px-6`,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/42">
            <span className="rounded-pill border border-white/8 bg-white/[0.03] px-2 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/62">
              Admin v2
            </span>
            <span>{workspaceMeta.title}</span>
            <span className="text-white/24">/</span>
            <span className="text-cyan-300/80">{workspaceMeta.eyebrow.toLowerCase()}</span>
          </div>
          <div className="mt-2 text-lg font-semibold tracking-[-0.01em] text-white">{workspaceMeta.queueLabel}</div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-white/58">{workspaceMeta.queueIntent}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-start gap-4 xl:items-end xl:justify-between">
        <ShellSearchForm />
        <ShellQuickActions />
      </div>
    </header>
  );
}
