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
        `sticky top-0 z-30 hidden border-border bg-bg/85 px-5 py-4 backdrop-blur-md lg:block`,
      )}
    >
      <div className="flex items-center gap-2 text-xs text-white/40">
        <span>Admin v2</span>
        <span>/</span>
        <span>{workspaceMeta.title}</span>
        <span>/</span>
        <span className="text-cyan-300/80">{workspaceMeta.eyebrow.toLowerCase()}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-start gap-4">
        <ShellSearchForm />
        <ShellQuickActions />
      </div>
    </header>
  );
}
