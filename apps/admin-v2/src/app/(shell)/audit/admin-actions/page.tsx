import Link from 'next/link';

import { ActionGhost } from '../../../../components/action-ghost';
import { DenseTable } from '../../../../components/dense-table';
import { MobileQueueCard } from '../../../../components/mobile-queue-card';
import { Panel } from '../../../../components/panel';
import { TabletRow } from '../../../../components/tablet-row';
import {
  buttonRowClass,
  fieldClass,
  fieldLabelClass,
  ghostButtonClass,
  textInputClass,
} from '../../../../components/ui-classes';
import { WorkspaceLayout } from '../../../../components/workspace-layout';
import { getAdminActionAudit, getQuickstart } from '../../../../lib/admin-api.server';
import { parseQuickstartId } from '../../../../lib/quickstart-investigations';

function formatDate(value: unknown): string {
  if (typeof value !== `string`) return `-`;
  return new Date(value).toLocaleString();
}

type AdminActionRow = Record<string, unknown>;

function renderResourceLink(item: AdminActionRow) {
  const resource = String(item.resource ?? ``);
  const resourceId = item.resourceId;
  if (resource === `consumer` && typeof resourceId === `string`) {
    return <Link href={`/consumers/${resourceId}`}>{resourceId}</Link>;
  }
  return String(resourceId ?? `-`);
}

function AdminActionsMobileCards({ items }: { items: AdminActionRow[] }) {
  if (items.length === 0) {
    return (
      <div className="readSurface md:hidden" data-view="mobile">
        <div className="panel muted">No admin actions match the current filters.</div>
      </div>
    );
  }

  return (
    <div className="readSurface md:hidden" data-view="mobile">
      <div className="queueCards">
        {items.map((item, index) => (
          <MobileQueueCard
            key={String(item.id ?? index)}
            id={String(item.id ?? index)}
            title={String(item.action ?? `-`)}
            subtitle={String(item.adminEmail ?? item.adminId ?? `-`)}
          >
            <div>
              {String(item.resource ?? `-`)}
              {` `}
              <span className="muted mono">{renderResourceLink(item)}</span>
            </div>
            <div className="muted mono">{JSON.stringify(item.metadata ?? {})}</div>
            <div className="muted">Created: {formatDate(item.createdAt)}</div>
          </MobileQueueCard>
        ))}
      </div>
    </div>
  );
}

function AdminActionsTabletRows({ items }: { items: AdminActionRow[] }) {
  if (items.length === 0) {
    return (
      <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
        <div className="panel muted">No admin actions match the current filters.</div>
      </div>
    );
  }

  return (
    <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
      <div className="condensedList">
        {items.map((item, index) => (
          <TabletRow
            key={String(item.id ?? index)}
            primary={
              <>
                <strong>{String(item.action ?? `-`)}</strong>
                <div className="muted">{String(item.adminEmail ?? item.adminId ?? `-`)}</div>
              </>
            }
            cells={[
              <div key="resource">
                {String(item.resource ?? `-`)}
                <div className="muted mono">{renderResourceLink(item)}</div>
              </div>,
              <div className="muted mono" key="metadata">
                {JSON.stringify(item.metadata ?? {})}
              </div>,
              <div className="muted" key="created">
                {formatDate(item.createdAt)}
              </div>,
              null,
            ]}
          />
        ))}
      </div>
    </div>
  );
}

function AdminActionsDesktopTable({ items }: { items: AdminActionRow[] }) {
  return (
    <div className="readSurface hidden xl:block" data-view="desktop">
      <DenseTable
        headers={[`Action`, `Resource`, `Admin`, `Metadata`, `Created`]}
        emptyMessage="No admin actions match the current filters."
      >
        {items.length === 0
          ? null
          : items.map((item, index) => (
              <tr key={String(item.id ?? index)}>
                <td>{String(item.action ?? `-`)}</td>
                <td>
                  {String(item.resource ?? `-`)}
                  <div className="muted mono">{renderResourceLink(item)}</div>
                </td>
                <td>{String(item.adminEmail ?? item.adminId ?? `-`)}</td>
                <td className="mono">{JSON.stringify(item.metadata ?? {})}</td>
                <td>{formatDate(item.createdAt)}</td>
              </tr>
            ))}
      </DenseTable>
    </div>
  );
}

export default async function AuditAdminActionsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    quickstart?: string;
    action?: string;
    adminId?: string;
    email?: string;
    resourceId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = params?.page ? Number(params.page) : 1;
  const requestedQuickstartId = parseQuickstartId(params?.quickstart);
  const resolvedQuickstart = requestedQuickstartId ? await getQuickstart(requestedQuickstartId) : null;
  const appliedQuickstart = resolvedQuickstart?.targetPath === `/audit/admin-actions` ? resolvedQuickstart : null;
  const action = params?.action?.trim() || appliedQuickstart?.filters.action || undefined;
  const adminId = params?.adminId?.trim() || appliedQuickstart?.filters.adminId || undefined;
  const email = params?.email?.trim() || appliedQuickstart?.filters.email || undefined;
  const resourceId = params?.resourceId?.trim() || appliedQuickstart?.filters.resourceId || undefined;
  const dateFrom = params?.dateFrom?.trim() || appliedQuickstart?.filters.dateFrom || undefined;
  const dateTo = params?.dateTo?.trim() || appliedQuickstart?.filters.dateTo || undefined;
  const data = await getAdminActionAudit({
    action,
    adminId,
    email,
    resourceId,
    dateFrom,
    dateTo,
    page,
  });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function pageHref(nextPage: number) {
    const query = new URLSearchParams();
    if (requestedQuickstartId) query.set(`quickstart`, requestedQuickstartId);
    if (action) query.set(`action`, action);
    if (adminId) query.set(`adminId`, adminId);
    if (email) query.set(`email`, email);
    if (resourceId) query.set(`resourceId`, resourceId);
    if (dateFrom) query.set(`dateFrom`, dateFrom);
    if (dateTo) query.set(`dateTo`, dateTo);
    query.set(`page`, String(nextPage));
    return `/audit/admin-actions?${query.toString()}`;
  }

  const items = (data?.items ?? []) as Array<Record<string, unknown>> as AdminActionRow[];

  return (
    <WorkspaceLayout workspace="audit/admin-actions">
      <>
        <Panel
          title="Audit / Admin Actions"
          description="Append-only admin action trail for consumers notes, flags and later workspace actions."
        >
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" method="get">
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Action</span>
              <input className={textInputClass} name="action" defaultValue={action ?? ``} placeholder="action" />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Admin email</span>
              <input className={textInputClass} name="email" defaultValue={email ?? ``} placeholder="admin email" />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Resource id</span>
              <input
                className={textInputClass}
                name="resourceId"
                defaultValue={resourceId ?? ``}
                placeholder="resource id"
              />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Date from</span>
              <input className={textInputClass} name="dateFrom" defaultValue={dateFrom ?? ``} placeholder="dateFrom" />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Date to</span>
              <input className={textInputClass} name="dateTo" defaultValue={dateTo ?? ``} placeholder="dateTo" />
            </label>
            <div className={buttonRowClass}>
              <button className={ghostButtonClass} type="submit">
                Apply
              </button>
              <a className={ghostButtonClass} href="/audit/admin-actions">
                Reset
              </a>
            </div>
          </form>
        </Panel>
        {appliedQuickstart ? (
          <Panel
            title={appliedQuickstart.label}
            description={appliedQuickstart.description}
            actions={<ActionGhost href="/audit/admin-actions">Remove quickstart</ActionGhost>}
          />
        ) : params?.quickstart ? (
          <Panel>
            <p className="muted">The requested quickstart could not be resolved for admin action audit.</p>
          </Panel>
        ) : null}
        <Panel
          title="Admin actions"
          description={`${data?.total ?? 0} results · page ${data?.page ?? 1} / ${totalPages}`}
          actions={
            <div className={buttonRowClass}>
              <a
                className={ghostButtonClass}
                aria-disabled={page <= 1}
                href={page > 1 ? pageHref(page - 1) : pageHref(1)}
              >
                Previous
              </a>
              <a
                className={ghostButtonClass}
                aria-disabled={page >= totalPages}
                href={page < totalPages ? pageHref(page + 1) : pageHref(totalPages)}
              >
                Next
              </a>
            </div>
          }
        >
          <AdminActionsMobileCards items={items} />
          <AdminActionsTabletRows items={items} />
          <AdminActionsDesktopTable items={items} />
        </Panel>
      </>
    </WorkspaceLayout>
  );
}
