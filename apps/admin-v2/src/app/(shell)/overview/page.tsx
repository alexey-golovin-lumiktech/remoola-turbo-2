import Link from 'next/link';

import { getOverviewSummary } from '../../../lib/admin-api.server';

function asRecord(value: unknown): Record<string, unknown> {
  return (value && typeof value === `object` ? value : {}) as Record<string, unknown>;
}

export default async function OverviewPage() {
  const summary = await getOverviewSummary();
  const signals = asRecord(summary?.signals);
  const activeSignalOrder = [
    `pendingVerifications`,
    `recentAdminActions`,
    `suspiciousAuthEvents`,
    `overduePaymentRequests`,
    `uncollectiblePaymentRequests`,
    `openDisputes`,
  ];
  const breadthSignalOrder = [`failedScheduledConversions`, `staleExchangeRates`];
  const activeStatKeys = activeSignalOrder.filter((key) => key !== `recentAdminActions`);
  const recentAdminActions = asRecord(signals.recentAdminActions);
  const recentItems = Array.isArray(recentAdminActions.items) ? recentAdminActions.items : [];

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>Overview</h1>
          <p className="muted">
            Operator landing page for the canonical MVP-2 shell, with active core pressure separated from exchange
            follow-up signals.
          </p>
        </div>
        <p className="muted">Computed: {summary?.computedAt ? new Date(summary.computedAt).toLocaleString() : `-`}</p>
      </section>

      <section className="statsGrid">
        {activeStatKeys.map((key) => {
          const signal = asRecord(signals[key]);
          const href = typeof signal.href === `string` ? signal.href : null;
          return (
            <article key={key} className="panel">
              <h3>{String(signal.label ?? key)}</h3>
              <p className="muted">Count: {signal.count == null ? `-` : String(signal.count)}</p>
              <p className="muted">Phase status: {String(signal.phaseStatus ?? `-`)}</p>
              <p className="muted">Availability: {String(signal.availability ?? `-`)}</p>
              {typeof signal.slaBreachedCount === `number` ? (
                <p className="muted">SLA breached: {String(signal.slaBreachedCount)}</p>
              ) : null}
              {href ? (
                <Link className="secondaryButton" href={href}>
                  Open
                </Link>
              ) : null}
            </article>
          );
        })}
      </section>

      <section className="panel">
        <div className="pageHeader">
          <div>
            <h2>Exchange follow-up</h2>
            <p className="muted">
              Exchange remains visible in overview as a separate operational section without changing the canonical
              `phaseStatus` vocabulary.
            </p>
          </div>
        </div>
        <div className="statsGrid">
          {breadthSignalOrder.map((key) => {
            const signal = asRecord(signals[key]);
            const href = typeof signal.href === `string` ? signal.href : null;
            return (
              <article key={key} className="panel">
                <h3>{String(signal.label ?? key)}</h3>
                <p className="muted">Count: {signal.count == null ? `-` : String(signal.count)}</p>
                <p className="muted">Phase status: {String(signal.phaseStatus ?? `-`)}</p>
                <p className="muted">Availability: {String(signal.availability ?? `-`)}</p>
                {href ? (
                  <Link className="secondaryButton" href={href}>
                    Open exchange surface
                  </Link>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel tableWrap">
        <div className="pageHeader">
          <div>
            <h2>Recent admin actions</h2>
            <p className="muted">Latest append-only audit entries surfaced directly from the admin action log.</p>
          </div>
          {typeof recentAdminActions.href === `string` ? (
            <Link className="secondaryButton" href={recentAdminActions.href}>
              Open audit
            </Link>
          ) : null}
        </div>
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Resource</th>
              <th>Admin</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {recentItems.length === 0 ? (
              <tr>
                <td colSpan={4}>No recent admin actions.</td>
              </tr>
            ) : null}
            {recentItems.map((item, index) => {
              const row = asRecord(item);
              return (
                <tr key={String(row.id ?? index)}>
                  <td>{String(row.action ?? `-`)}</td>
                  <td>
                    {String(row.resource ?? `-`)}
                    <div className="muted mono">{String(row.resourceId ?? `-`)}</div>
                  </td>
                  <td>{String(row.adminEmail ?? `-`)}</td>
                  <td>{typeof row.createdAt === `string` ? new Date(row.createdAt).toLocaleString() : `-`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
