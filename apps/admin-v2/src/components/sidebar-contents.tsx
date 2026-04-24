import Link from 'next/link';
import { type ReactElement } from 'react';

import { cn } from '@remoola/ui';

import { ActionGhost } from '@/components/action-ghost';

import { LayerLegendRow } from './layer-legend-row';
import { SidebarSection } from './sidebar-section';
import { TinyPill } from './tiny-pill';
import {
  auditExplorerItems,
  coreShellItems,
  financeBreadthItems,
  laterBreadthItems,
  maturityItems,
  topLevelBreadthItems,
} from '../app/(shell)/shell-nav';
import { type AdminIdentity, type QuickstartCard } from '../lib/admin-api.server';
import { buildQuickstartHref, filterQuickstartsForWorkspaces } from '../lib/quickstart-investigations';

type SignalCount = { count: number; deferred: boolean };

const artifactContractLayers = [
  { label: `Operational signals`, value: `Verification, Payments, Ledger, Disputes` },
  { label: `Domain reads`, value: `Read-only by capability` },
  { label: `Audit explorers`, value: `One bucket family (Auth / Admin / Consumer)` },
  { label: `Derived chrome`, value: `Preview-only assertions; not enforced` },
] as const;

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
            <div className="text-xs text-white/40">Derived pack-clean v2 prototype</div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300/75">Artifact contract</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <TinyPill tone="cyan">queue-first</TinyPill>
            <TinyPill>audit-first</TinyPill>
            <TinyPill>case-first</TinyPill>
            <TinyPill>derived artifact</TinyPill>
          </div>
          <p className="mt-3 leading-6 text-white/55">
            This surface is an illustrative interpretation artifact. Canonical planning, phase-specific navigation, and
            route-family truth remain in the markdown pack.
          </p>
          <div className="mt-4 space-y-3">
            {artifactContractLayers.map((layer) => (
              <LayerLegendRow key={layer.label} label={layer.label} value={layer.value} />
            ))}
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-5 px-3 pb-5" aria-label="Canonical MVP-2 shell navigation">
        <SidebarSection
          title="Core shell"
          items={visibleCoreShellItems}
          signalCounts={signalCounts}
          activePath={activePath}
        />
        <SidebarSection
          title="Top-level breadth"
          items={visibleTopLevelBreadthItems}
          signalCounts={signalCounts}
          activePath={activePath}
        />
        <SidebarSection
          title="Finance breadth"
          description="Payouts and Payment Methods stay nested finance breadth, not permanent first-level peers."
          items={visibleFinanceBreadthItems}
          signalCounts={signalCounts}
          activePath={activePath}
        />
        <SidebarSection
          title="Maturity"
          description="System stays a read-only maturity destination for cross-domain health signals, not a promoted core shell peer."
          items={visibleMaturityItems}
          signalCounts={signalCounts}
          activePath={activePath}
        />
        <SidebarSection
          title="Audit explorers"
          description="Audit stays grouped as one shell bucket over the canonical explorer family."
          items={visibleAuditExplorerItems}
          signalCounts={signalCounts}
          activePath={activePath}
        />
        <SidebarSection
          title="Later breadth"
          items={visibleLaterBreadthItems}
          signalCounts={signalCounts}
          activePath={activePath}
        />
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <div className="text-[11px] uppercase tracking-[0.24em] text-white/[0.32]">Frequent investigation starts</div>
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
                    {view.eyebrow}
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

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
          <div className="font-medium text-white/85">{identity?.email ?? `Access denied`}</div>
          <div className="mt-1 text-white/45">
            {identity
              ? `${identity.role ?? `UNAUTHORIZED`} · actor attribution required`
              : `This admin type is outside the allowed Admin v2 surfaces.`}
          </div>
          <div className="mt-1 text-xs text-white/35">Phase: {identity?.phase ?? `MVP-2 canonical shell framing`}</div>
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
