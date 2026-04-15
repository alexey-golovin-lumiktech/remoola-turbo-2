import Link from 'next/link';

import { getAdminIdentity } from '../../lib/admin-api.server';

const navItems = [
  { href: `/overview`, label: `Overview`, workspace: `overview` },
  { href: `/verification`, label: `Verification`, workspace: `verification` },
  { href: `/consumers`, label: `Consumers`, workspace: `consumers` },
  { href: `/audit/auth`, label: `Audit · Auth`, workspace: `audit` },
  { href: `/audit/admin-actions`, label: `Audit · Admin Actions`, workspace: `audit` },
  { href: `/audit/consumer-actions`, label: `Audit · Consumer Actions`, workspace: `audit` },
] as const;

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const identity = await getAdminIdentity();
  const allowedWorkspaces = new Set(identity?.workspaces ?? []);
  const visibleNavItems = navItems.filter((item) => allowedWorkspaces.has(item.workspace));

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Admin v2</div>
        <nav className="navList">
          {visibleNavItems.map((item) => (
            <Link key={item.href} href={item.href} className="navLink">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="panel">
          <p className="muted">{identity?.email ?? `Access denied`}</p>
          <p className="muted">Role: {identity?.role ?? `UNAUTHORIZED`}</p>
          <p className="muted">Phase: {identity?.phase ?? `MVP-1b`}</p>
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
            <p className="muted">Only OPS_ADMIN and SUPER_ADMIN can use MVP-1b workspaces.</p>
          </section>
        )}
      </main>
    </div>
  );
}
