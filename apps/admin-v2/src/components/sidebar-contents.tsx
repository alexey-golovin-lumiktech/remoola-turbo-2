import Link from 'next/link';
import { type ReactElement } from 'react';

import { cn } from '@remoola/ui';

import { ActionGhost } from '@/components/action-ghost';

import { SidebarSection } from './sidebar-section';
import {
  auditExplorerItems,
  coreShellItems,
  financeBreadthItems,
  laterBreadthItems,
  maturityItems,
  topLevelBreadthItems,
} from '../app/(shell)/shell-nav';
import { type AdminIdentity, type QuickstartCard } from '../lib/admin-api.server';
import {
  buildQuickstartHref,
  filterQuickstartsForWorkspaces,
  normalizeQuickstartEyebrow,
} from '../lib/quickstart-investigations';

type SignalCount = { count: number; deferred: boolean };

type SidebarContentsProps = {
  identity: AdminIdentity | null;
  activePath: string | null;
  signalCounts: Record<string, SignalCount>;
  quickstarts: QuickstartCard[];
};

export function SidebarContents({
  identity,
  activePath,
  signalCounts,
  quickstarts,
}: SidebarContentsProps): ReactElement {
  const allowedWorkspaces = new Set(identity?.workspaces ?? []);
  const visibleCoreShellItems = coreShellItems.filter((item) => allowedWorkspaces.has(item.workspace));
  const visibleTopLevelBreadthItems = topLevelBreadthItems.filter((item) => allowedWorkspaces.has(item.workspace));
  const visibleFinanceBreadthItems = financeBreadthItems.filter((item) => allowedWorkspaces.has(item.workspace));
  const visibleMaturityItems = maturityItems.filter((item) => allowedWorkspaces.has(item.workspace));
  const visibleAuditExplorerItems = auditExplorerItems.filter((item) => allowedWorkspaces.has(item.workspace));
  const visibleLaterBreadthItems = laterBreadthItems.filter((item) => allowedWorkspaces.has(item.workspace));
  const visibleQuickstarts = filterQuickstartsForWorkspaces(quickstarts, identity?.workspaces);

  return (
    <>
      <div className="px-5 py-5">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              `brandBug`,
              `flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 font-semibold text-cyan-200`,
            )}
            aria-hidden="true"
          >
            A2
          </div>
          <div className={cn(`brand`, `min-w-0`)}>
            <div className="text-lg font-semibold leading-tight">Admin v2</div>
            <div className="text-xs text-white/40">Admin workspace</div>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-5 px-3 pb-5" aria-label="Admin workspace navigation">
        <SidebarSection
          title="Primary workspaces"
          description="Main operational routes with the shortest path into active queues and reviews."
          items={visibleCoreShellItems}
          signalCounts={signalCounts}
          activePath={activePath}
          priority="core"
        />
        <SidebarSection
          title="Breadth workspaces"
          compact
          items={visibleTopLevelBreadthItems}
          signalCounts={signalCounts}
          activePath={activePath}
        />
        <SidebarSection
          title="Finance tools"
          compact
          items={visibleFinanceBreadthItems}
          signalCounts={signalCounts}
          activePath={activePath}
        />
        <SidebarSection
          title="System"
          compact
          items={visibleMaturityItems}
          signalCounts={signalCounts}
          activePath={activePath}
        />
        <SidebarSection
          title="Audit logs"
          compact
          items={visibleAuditExplorerItems}
          signalCounts={signalCounts}
          activePath={activePath}
        />
        <SidebarSection
          title="Admin tools"
          compact
          items={visibleLaterBreadthItems}
          signalCounts={signalCounts}
          activePath={activePath}
        />
      </nav>

      <div className="border-t border-white/10 bg-white/[0.02] px-5 py-4">
        <div className="text-[11px] uppercase tracking-[0.24em] text-white/[0.32]">Shortcuts</div>
        <div className="mt-1 text-xs leading-5 text-white/40">
          Recommended investigation starts for the current admin scope.
        </div>
        <div className="mt-3 space-y-2">
          {visibleQuickstarts.map((view) => (
            <Link
              key={view.id}
              href={buildQuickstartHref(view.targetPath, view.id)}
              className={cn(
                `group block w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left transition hover:border-cyan-400/30 hover:bg-cyan-500/[0.06]`,
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45 group-hover:text-cyan-200/80">
                    {normalizeQuickstartEyebrow(view.eyebrow)}
                  </div>
                  <div className="mt-1 text-sm font-medium text-white/85 group-hover:text-white">{view.label}</div>
                  <div className="mt-2 text-[11px] leading-5 text-white/45">{view.description}</div>
                </div>
                <span aria-hidden="true" className="pt-0.5 text-xs text-white/35 group-hover:text-cyan-200">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm shadow-xs">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/[0.32]">Identity</div>
          <div className="font-medium text-white/85">{identity?.email ?? `Access denied`}</div>
          <div className="mt-1 text-white/45">
            {identity
              ? `${identity.role ?? `UNAUTHORIZED`} · actor attribution required`
              : `This admin type is outside the allowed Admin v2 surfaces.`}
          </div>
          <div className="mt-1 text-xs text-white/35">Access: {identity?.phase ?? `Workspace access`}</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {identity ? (
              <Link
                href="/me/sessions"
                className="inline-flex items-center rounded-input border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/85 hover:bg-white/[0.05]"
              >
                My sessions
              </Link>
            ) : null}
            <form action="/logout" method="post">
              <ActionGhost type="submit" className="min-h-0 px-3 py-1.5 text-xs text-white/85">
                Log out
              </ActionGhost>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
