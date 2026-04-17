import Link from 'next/link';

import { getAdminIdentity } from '../../lib/admin-api.server';

const coreShellItems = [
  { href: `/overview`, label: `Overview`, workspace: `overview` },
  { href: `/consumers`, label: `Consumers`, workspace: `consumers` },
  { href: `/verification`, label: `Verification`, workspace: `verification` },
  { href: `/payments`, label: `Payments`, workspace: `payments` },
  { href: `/ledger`, label: `Ledger and Disputes`, workspace: `ledger` },
  { href: `/audit/auth`, label: `Audit`, workspace: `audit` },
] as const;

const topLevelBreadthItems = [
  { href: `/exchange`, label: `Exchange`, workspace: `exchange` },
  { href: `/documents`, label: `Documents`, workspace: `documents` },
] as const;

const financeBreadthItems = [
  { href: `/payouts`, label: `Payouts`, workspace: `ledger` },
  { href: `/payment-methods`, label: `Payment Methods`, workspace: `payment_methods` },
] as const;

const maturityItems = [{ href: `/system`, label: `System`, workspace: `system` }] as const;

const auditExplorerItems = [
  { href: `/audit/auth`, label: `Auth`, workspace: `audit` },
  { href: `/audit/admin-actions`, label: `Admin Actions`, workspace: `audit` },
  { href: `/audit/consumer-actions`, label: `Consumer Actions`, workspace: `audit` },
] as const;

const laterBreadthItems = [{ href: `/admins`, label: `Admins`, workspace: `admins` }] as const;

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const identity = await getAdminIdentity();
  const allowedWorkspaces = new Set(identity?.workspaces ?? []);
  const visibleCoreShellItems = coreShellItems.filter((item) => allowedWorkspaces.has(item.workspace));
  const visibleTopLevelBreadthItems = topLevelBreadthItems.filter((item) => allowedWorkspaces.has(item.workspace));
  const visibleFinanceBreadthItems = financeBreadthItems.filter((item) => allowedWorkspaces.has(item.workspace));
  const visibleMaturityItems = maturityItems.filter((item) => allowedWorkspaces.has(item.workspace));
  const visibleAuditExplorerItems = auditExplorerItems.filter((item) => allowedWorkspaces.has(item.workspace));
  const visibleLaterBreadthItems = laterBreadthItems.filter((item) => allowedWorkspaces.has(item.workspace));

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Admin v2</div>
        <nav className="navList" aria-label="Canonical MVP-2 shell navigation">
          <NavSection title="Core shell" items={visibleCoreShellItems} />
          <NavSection title="Top-level breadth" items={visibleTopLevelBreadthItems} />
          <NavSection
            title="Finance breadth"
            description="Payouts and Payment Methods stay nested finance breadth, not permanent first-level peers."
            items={visibleFinanceBreadthItems}
          />
          <NavSection
            title="Maturity"
            description="System stays a read-only maturity destination for cross-domain health signals, not a promoted core shell peer."
            items={visibleMaturityItems}
          />
          <NavSection
            title="Audit explorers"
            description="Audit stays grouped as one shell bucket over the canonical explorer family."
            items={visibleAuditExplorerItems}
          />
          <NavSection title="Later breadth" items={visibleLaterBreadthItems} />
        </nav>
        <div className="panel">
          <p className="muted">{identity?.email ?? `Access denied`}</p>
          <p className="muted">Role: {identity?.role ?? `UNAUTHORIZED`}</p>
          <p className="muted">Phase: {identity?.phase ?? `MVP-2 canonical shell framing`}</p>
          {identity ? null : <p className="muted">This admin type is outside the allowed Admin v2 surfaces.</p>}
          <form action="/logout" method="post">
            <button type="submit" className="secondaryButton">
              Log out
            </button>
          </form>
        </div>
      </aside>
      <main className="content">
        {identity ? (
          children
        ) : (
          <section className="panel">
            <h1>Access denied</h1>
            <p className="muted">This admin identity is outside the schema-backed admin-v2 workspace allowlist.</p>
          </section>
        )}
      </main>
    </div>
  );
}

function NavSection({
  title,
  items,
  description,
}: {
  title: string;
  items: ReadonlyArray<{ href: string; label: string }>;
  description?: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="panel">
      <p className="muted">{title}</p>
      {description ? <p className="muted">{description}</p> : null}
      {items.map((item) => (
        <Link key={`${title}-${item.href}`} href={item.href} className="navLink">
          {item.label}
        </Link>
      ))}
    </div>
  );
}
