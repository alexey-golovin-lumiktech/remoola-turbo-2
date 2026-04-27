import { headers } from 'next/headers';

import { getActivePathFromHeaders } from './nav-state';
import {
  auditExplorerItems,
  coreShellItems,
  financeBreadthItems,
  laterBreadthItems,
  maturityItems,
  topLevelBreadthItems,
} from './shell-nav';
import { AdminSurfaceAccessDenied, AdminSurfaceUnavailable } from '../../components/admin-surface-state';
import { MobileBottomNav } from '../../components/mobile-bottom-nav';
import { MobilePageHeader } from '../../components/mobile-page-header';
import { MobileShellDrawer } from '../../components/mobile-shell-drawer';
import { MobileShellUtilityBar } from '../../components/mobile-shell-utility-bar';
import { MobileTopChips } from '../../components/mobile-top-chips';
import { ShellHeader } from '../../components/shell-header';
import { SidebarContents } from '../../components/sidebar-contents';
import {
  getAdminIdentityResult,
  getOverviewSummary,
  getQuickstarts,
  type OverviewSummaryResponse,
  type QuickstartCard,
} from '../../lib/admin-api.server';
import { filterQuickstartsForWorkspaces } from '../../lib/quickstart-investigations';
import { readCurrentWorkspaceSignalCount, type SignalCount } from '../../lib/workspace-signal';

export {
  auditExplorerItems,
  coreShellItems,
  financeBreadthItems,
  laterBreadthItems,
  maturityItems,
  topLevelBreadthItems,
};

async function safeGetOverviewSummary(): Promise<OverviewSummaryResponse | null> {
  try {
    if (typeof getOverviewSummary !== `function`) {
      return null;
    }
    return await getOverviewSummary();
  } catch {
    return null;
  }
}

async function safeGetQuickstarts(): Promise<QuickstartCard[]> {
  try {
    return await getQuickstarts(`shell`);
  } catch {
    return [];
  }
}

async function safeGetActivePath(): Promise<string | null> {
  try {
    const headerStore = await headers();
    return getActivePathFromHeaders(headerStore);
  } catch {
    return null;
  }
}

function renderAccessWarning(
  identity: { source?: string; role?: string | null; workspaces?: string[]; bootstrapReason?: string | null } | null,
) {
  if (!identity || identity.source === `schema`) {
    return null;
  }

  const hasWorkspaces = (identity.workspaces?.length ?? 0) > 0;
  const descriptionByReason: Record<string, string> = {
    schema_role_missing: hasWorkspaces
      ? `Schema-backed RBAC is degraded because this admin record is missing a schema role assignment. Bootstrap compatibility is active until the role link is repaired.`
      : `This admin identity can only bootstrap into Admin v2 because no schema-backed role assignment is linked yet. Workspace access stays locked until RBAC is repaired.`,
    schema_role_unknown: `Schema-backed RBAC is degraded because the linked admin role is outside the current Admin v2 role catalog. Review the role catalog before relying on this posture.`,
    schema_capabilities_invalid: `Schema-backed RBAC is degraded because the linked role contains invalid or duplicated capability values. Repair the schema role definition before relying on this posture.`,
    schema_missing_me_read: `Schema-backed RBAC is degraded because the linked role cannot satisfy the required me.read capability. Repair the role capability set before relying on this posture.`,
  };
  const description =
    (identity.bootstrapReason ? descriptionByReason[identity.bootstrapReason] : null) ??
    (hasWorkspaces
      ? `Schema-backed RBAC is not fully available for this admin identity. Bootstrap compatibility is active; review role assignment before relying on this posture.`
      : `This admin identity can only bootstrap into Admin v2 until a schema-backed role is assigned. Workspace access stays locked until RBAC is repaired.`);

  return (
    <div className="rounded-card border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      <p className="font-medium">RBAC bootstrap mode</p>
      <p className="mt-1 text-amber-50/85">{description}</p>
    </div>
  );
}

function buildSignalCounts(summary: OverviewSummaryResponse | null): Record<string, SignalCount> {
  const out: Record<string, SignalCount> = {};
  if (!summary || !summary.signals || typeof summary.signals !== `object`) {
    return out;
  }
  for (const [key, raw] of Object.entries(summary.signals)) {
    const sig = (raw && typeof raw === `object` ? raw : {}) as Record<string, unknown>;
    const count = typeof sig.count === `number` && Number.isFinite(sig.count) ? sig.count : null;
    if (count == null) continue;
    const availability = typeof sig.availability === `string` ? sig.availability : null;
    out[key] = { count, deferred: availability === `deferred` };
  }
  return out;
}

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const [identityResult, summary, quickstarts, activePath] = await Promise.all([
    getAdminIdentityResult(),
    safeGetOverviewSummary(),
    safeGetQuickstarts(),
    safeGetActivePath(),
  ]);
  const identity = identityResult.status === `ready` ? identityResult.data : null;
  const signalCounts = buildSignalCounts(summary);
  const visibleQuickstarts = filterQuickstartsForWorkspaces(quickstarts, identity);
  const currentWorkspaceSignalCount = readCurrentWorkspaceSignalCount(activePath, signalCounts);

  return (
    <div className="grid min-h-screen grid-cols-1 bg-bg lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="hidden lg:flex lg:min-h-screen lg:flex-col lg:overflow-hidden lg:border-r lg:border-border lg:bg-panel">
        <SidebarContents
          identity={identity}
          activePath={activePath}
          signalCounts={signalCounts}
          quickstarts={visibleQuickstarts}
        />
      </aside>
      <main className="min-w-0 overflow-x-hidden px-4 py-4 pb-24 md:pb-6 lg:px-6 lg:py-6 lg:pb-6 xl:px-8">
        {identity ? (
          <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
            <ShellHeader />
            {renderAccessWarning(identity)}
            <MobileShellDrawer activePath={activePath}>
              <SidebarContents
                identity={identity}
                activePath={activePath}
                signalCounts={signalCounts}
                quickstarts={visibleQuickstarts}
              />
            </MobileShellDrawer>
            <MobileTopChips identity={identity} activePath={activePath} />
            <MobilePageHeader
              activePath={activePath}
              signalCounts={signalCounts}
              liveCount={currentWorkspaceSignalCount}
            />
            <MobileShellUtilityBar activePath={activePath} />
            {children}
            <MobileBottomNav identity={identity} activePath={activePath} />
          </div>
        ) : identityResult.status === `forbidden` ? (
          <AdminSurfaceAccessDenied
            title="Access denied"
            description="This admin identity is outside the schema-backed admin-v2 workspace allowlist."
          />
        ) : (
          <AdminSurfaceUnavailable
            title="Admin workspace unavailable"
            description="The admin-v2 workspace could not confirm backend access right now. Retry shortly."
          />
        )}
      </main>
    </div>
  );
}
