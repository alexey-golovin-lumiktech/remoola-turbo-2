import { headers } from 'next/headers';

import { getActivePathFromHeaders } from './nav-state';
import { MobileBottomNav } from '../../components/mobile-bottom-nav';
import { MobilePageHeader } from '../../components/mobile-page-header';
import { MobileShellDrawer } from '../../components/mobile-shell-drawer';
import { MobileTopChips } from '../../components/mobile-top-chips';
import { ShellHeader } from '../../components/shell-header';
import { SidebarContents } from '../../components/sidebar-contents';
import {
  getAdminIdentity,
  getOverviewSummary,
  getQuickstarts,
  type OverviewSummaryResponse,
  type QuickstartCard,
} from '../../lib/admin-api.server';
import { filterQuickstartsForWorkspaces } from '../../lib/quickstart-investigations';

export {
  auditExplorerItems,
  coreShellItems,
  financeBreadthItems,
  laterBreadthItems,
  maturityItems,
  topLevelBreadthItems,
} from './shell-nav';

type SignalCount = { count: number; deferred: boolean };

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
  const [identity, summary, quickstarts, activePath] = await Promise.all([
    getAdminIdentity(),
    safeGetOverviewSummary(),
    safeGetQuickstarts(),
    safeGetActivePath(),
  ]);
  const signalCounts = buildSignalCounts(summary);
  const visibleQuickstarts = filterQuickstartsForWorkspaces(quickstarts, identity?.workspaces);

  return (
    <div className="grid min-h-screen grid-cols-1 bg-bg md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="hidden md:flex md:min-h-screen md:flex-col md:overflow-hidden md:border-r md:border-border md:bg-panel">
        <SidebarContents
          identity={identity}
          activePath={activePath}
          signalCounts={signalCounts}
          quickstarts={visibleQuickstarts}
        />
      </aside>
      <main className="min-w-0 px-4 py-4 pb-[var(--mobile-bottom-nav-reserved-space)] md:px-6 md:py-6 md:pb-6 xl:px-8">
        {identity ? (
          <div className="flex min-w-0 flex-col gap-6">
            <ShellHeader />
            <MobileShellDrawer>
              <SidebarContents
                identity={identity}
                activePath={activePath}
                signalCounts={signalCounts}
                quickstarts={visibleQuickstarts}
              />
            </MobileShellDrawer>
            <MobileTopChips identity={identity} activePath={activePath} />
            <MobilePageHeader activePath={activePath} />
            {children}
          </div>
        ) : (
          <section className="rounded-card border border-border bg-panel p-5">
            <h1 className="text-xl font-semibold text-text">Access denied</h1>
            <p className="mt-2 text-sm leading-6 text-muted-56">
              This admin identity is outside the schema-backed admin-v2 workspace allowlist.
            </p>
          </section>
        )}
      </main>
      <MobileBottomNav identity={identity} activePath={activePath} />
    </div>
  );
}
