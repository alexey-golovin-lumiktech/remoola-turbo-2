import { type ReactElement, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { ContextRail } from './context-rail';
import { contextRailData, type WorkspaceKey } from './context-rail-data';

type WorkspaceLayoutProps = {
  workspace: WorkspaceKey;
  children: ReactNode;
};

export function WorkspaceLayout({ workspace, children }: WorkspaceLayoutProps): ReactElement {
  const entry = Object.prototype.hasOwnProperty.call(contextRailData, workspace) ? contextRailData[workspace] : null;

  return (
    <div className={cn(`workspaceLayout`, `grid grid-cols-1 gap-6 xl:grid-cols-[1.55fr_0.95fr]`)}>
      <div className={cn(`workspaceLayout__main`, `min-w-0 flex flex-col gap-6`)}>{children}</div>
      {entry ? (
        <aside
          className="hidden xl:block xl:sticky xl:top-24 xl:self-start xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto"
          aria-label={`${entry.title} context`}
        >
          <ContextRail entry={entry} />
        </aside>
      ) : null}
    </div>
  );
}
