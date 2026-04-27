'use client';

import { usePathname } from 'next/navigation';
import { type ReactElement, type ReactNode } from 'react';

import { cn } from '@remoola/ui';

import { Panel } from './panel';
import { mutedTextClass } from './ui-classes';
import { normalizeActivePath } from '../app/(shell)/nav-state';
import { getWorkspaceMeta } from '../lib/workspace-meta';

type MobileShellUtilityBarClientProps = {
  activePath?: string | null;
  searchForm: ReactNode;
  quickActions: ReactNode;
};

export function MobileShellUtilityBarClient({
  activePath = null,
  searchForm,
  quickActions,
}: MobileShellUtilityBarClientProps): ReactElement {
  const pathname = usePathname();
  const resolvedActivePath = normalizeActivePath(pathname) ?? activePath;
  const workspaceMeta = getWorkspaceMeta(resolvedActivePath);
  const compactChrome = workspaceMeta.mobileChromeMode === `compact`;

  if (compactChrome) {
    return (
      <details className="lg:hidden">
        <summary className="list-none rounded-card border border-white/8 bg-linear-to-br from-white/[0.04] to-white/[0.02] px-4 py-3 text-sm text-white/80 shadow-[0_12px_30px_rgba(2,6,23,0.14)]">
          <span className="block font-medium text-white/92">Quick access</span>
          <span className="mt-1 block text-xs text-white/50">{workspaceMeta.queueIntent}</span>
        </summary>
        <div className="mt-2">
          <Panel
            className="lg:hidden"
            title="Quick access"
            description={`Search the admin surface or jump into high-frequency actions from ${workspaceMeta.title}.`}
            surface="meta"
          >
            <div className="flex flex-col gap-3">
              {searchForm}
              <p className={mutedTextClass}>
                Use exact ids, emails, payment requests, consumers, and linked investigation paths while staying
                oriented in {workspaceMeta.queueLabel}.
              </p>
              {quickActions}
            </div>
          </Panel>
        </div>
      </details>
    );
  }

  return (
    <Panel
      className={cn(`lg:hidden`)}
      title="Quick access"
      description={`Search the admin surface or jump into high-frequency actions from ${workspaceMeta.title} without leaving the current mobile flow.`}
      surface="meta"
    >
      <div className="flex flex-col gap-3">
        {searchForm}
        <p className={mutedTextClass}>
          Use exact ids, emails, payment requests, consumers, and linked investigation paths while staying oriented in
          {` ${workspaceMeta.queueLabel}.`}
        </p>
        {quickActions}
      </div>
    </Panel>
  );
}
