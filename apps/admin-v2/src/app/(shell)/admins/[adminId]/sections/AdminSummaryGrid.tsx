import { EMPTY_VALUE, formatDateTime } from '../../../../../lib/admin-format';
import { type AdminCasePageData } from '../page.loader';

export function AdminSummaryGrid({ admin }: { admin: AdminCasePageData[`admin`] }) {
  return (
    <section className="statsGrid">
      <article className="panel">
        <h3>Lifecycle</h3>
        <p className="muted">Created: {formatDateTime(admin.core.createdAt)}</p>
        <p className="muted">Updated: {formatDateTime(admin.updatedAt)}</p>
        <p className="muted">Deactivated: {formatDateTime(admin.core.deletedAt)}</p>
        <p className="muted">Data freshness: {admin.dataFreshnessClass}</p>
      </article>
      <article className="panel">
        <h3>Access profile</h3>
        <p className="muted">Source: {admin.accessProfile.source}</p>
        <p className="muted">Resolved role: {admin.accessProfile.resolvedRole ?? EMPTY_VALUE}</p>
        <p className="muted">Schema role: {admin.accessProfile.schemaRoleKey ?? EMPTY_VALUE}</p>
        <p className="muted">Workspaces: {admin.accessProfile.workspaces.join(`, `) || EMPTY_VALUE}</p>
      </article>
      <article className="panel">
        <h3>Historical integrity</h3>
        <p className="muted">Authored notes: {admin.authoredNotesCount}</p>
        <p className="muted">Authored flags: {admin.authoredFlagsCount}</p>
        <p className="muted">Settings theme: {admin.settings?.theme ?? `SYSTEM`}</p>
      </article>
    </section>
  );
}
