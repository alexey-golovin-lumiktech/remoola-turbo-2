import { headers } from 'next/headers';

import { cn } from '@/lib/cn';

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

  return (
    <div
      className={cn(
        `shell`,
        `grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)] min-h-screen`,
      )}
    >
      <aside
        className={cn(
          `sidebar`,
          `hidden md:flex md:h-screen md:flex-col md:overflow-y-auto md:border-r md:border-white/10 md:bg-[#0d1627]`,
        )}
      >
        <SidebarContents
          identity={identity}
          activePath={activePath}
          signalCounts={signalCounts}
          quickstarts={quickstarts}
        />
      </aside>
      <main className={cn(`content`, `min-w-0`)}>
        {identity ? (
          <>
            <ShellHeader />
            <MobileShellDrawer>
              <SidebarContents
                identity={identity}
                activePath={activePath}
                signalCounts={signalCounts}
                quickstarts={quickstarts}
              />
            </MobileShellDrawer>
            <MobileTopChips identity={identity} activePath={activePath} />
            <MobilePageHeader activePath={activePath} />
            {children}
          </>
        ) : (
          <section className="panel">
            <h1>Access denied</h1>
            <p className="muted">This admin identity is outside the schema-backed admin-v2 workspace allowlist.</p>
          </section>
        )}
      </main>
      <MobileBottomNav identity={identity} activePath={activePath} />
    </div>
  );
}
