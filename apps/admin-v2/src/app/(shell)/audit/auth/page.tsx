import { DenseTable } from '../../../../components/dense-table';
import { MobileQueueCard } from '../../../../components/mobile-queue-card';
import { TabletRow } from '../../../../components/tablet-row';
import { WorkspaceLayout } from '../../../../components/workspace-layout';
import { getAuthAudit } from '../../../../lib/admin-api.server';

function formatDate(value: unknown): string {
  if (typeof value !== `string`) return `-`;
  return new Date(value).toLocaleString();
}

type AuthAuditRow = {
  id?: unknown;
  email?: unknown;
  event?: unknown;
  ipAddress?: unknown;
  userAgent?: unknown;
  createdAt?: unknown;
};

function AuthAuditMobileCards({ items }: { items: AuthAuditRow[] }) {
  if (items.length === 0) {
    return (
      <div className="readSurface md:hidden" data-view="mobile">
        <div className="panel muted">No auth audit events match the current filters.</div>
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
            title={String(item.event ?? `-`)}
            subtitle={String(item.email ?? `-`)}
          >
            <div className="muted">IP: {String(item.ipAddress ?? `-`)}</div>
            <div className="muted">UA: {String(item.userAgent ?? `-`)}</div>
            <div className="muted">Created: {formatDate(item.createdAt)}</div>
          </MobileQueueCard>
        ))}
      </div>
    </div>
  );
}

function AuthAuditTabletRows({ items }: { items: AuthAuditRow[] }) {
  if (items.length === 0) {
    return (
      <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
        <div className="panel muted">No auth audit events match the current filters.</div>
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
                <strong>{String(item.event ?? `-`)}</strong>
                <div className="muted">{String(item.email ?? `-`)}</div>
              </>
            }
            cells={[
              <div className="muted" key="ip">
                IP: {String(item.ipAddress ?? `-`)}
              </div>,
              <div className="muted" key="ua">
                UA: {String(item.userAgent ?? `-`)}
              </div>,
              <div className="muted" key="created">
                Created: {formatDate(item.createdAt)}
              </div>,
              null,
            ]}
          />
        ))}
      </div>
    </div>
  );
}

function AuthAuditDesktopTable({ items }: { items: AuthAuditRow[] }) {
  return (
    <div className="readSurface hidden xl:block" data-view="desktop">
      <DenseTable
        headers={[`Email`, `Event`, `IP`, `User agent`, `Created`]}
        emptyMessage="No auth audit events match the current filters."
      >
        {items.length === 0
          ? null
          : items.map((item, index) => (
              <tr key={String(item.id ?? index)}>
                <td>{String(item.email ?? `-`)}</td>
                <td>{String(item.event ?? `-`)}</td>
                <td>{String(item.ipAddress ?? `-`)}</td>
                <td>{String(item.userAgent ?? `-`)}</td>
                <td>{formatDate(item.createdAt)}</td>
              </tr>
            ))}
      </DenseTable>
    </div>
  );
}

export default async function AuditAuthPage({
  searchParams,
}: {
  searchParams?: Promise<{
    email?: string;
    event?: string;
    ipAddress?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = params?.page ? Number(params.page) : 1;
  const data = await getAuthAudit({
    email: params?.email,
    event: params?.event,
    ipAddress: params?.ipAddress,
    dateFrom: params?.dateFrom,
    dateTo: params?.dateTo,
    page,
  });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function pageHref(nextPage: number) {
    const query = new URLSearchParams();
    if (params?.email?.trim()) query.set(`email`, params.email.trim());
    if (params?.event?.trim()) query.set(`event`, params.event.trim());
    if (params?.ipAddress?.trim()) query.set(`ipAddress`, params.ipAddress.trim());
    if (params?.dateFrom?.trim()) query.set(`dateFrom`, params.dateFrom.trim());
    if (params?.dateTo?.trim()) query.set(`dateTo`, params.dateTo.trim());
    query.set(`page`, String(nextPage));
    return `/audit/auth?${query.toString()}`;
  }

  const items: AuthAuditRow[] = (data?.items ?? []) as AuthAuditRow[];

  return (
    <WorkspaceLayout workspace="audit/auth">
      <>
        <section className="panel pageHeader">
          <div>
            <h1>Audit / Auth</h1>
            <p className="muted">Searchable admin auth audit for login, refresh and logout reconstruction.</p>
          </div>
          <form className="actionsRow" method="get">
            <input name="email" defaultValue={params?.email ?? ``} placeholder="admin email" />
            <input name="event" defaultValue={params?.event ?? ``} placeholder="event" />
            <input name="ipAddress" defaultValue={params?.ipAddress ?? ``} placeholder="ip or prefix" />
            <input name="dateFrom" defaultValue={params?.dateFrom ?? ``} placeholder="2026-04-15T00:00:00Z" />
            <input name="dateTo" defaultValue={params?.dateTo ?? ``} placeholder="2026-04-15T23:59:59Z" />
            <button className="secondaryButton" type="submit">
              Apply
            </button>
          </form>
        </section>
        <section className="panel">
          <div className="pageHeader">
            <p className="muted">
              {data?.total ?? 0} results · page {data?.page ?? 1} / {totalPages}
            </p>
            <div className="actionsRow">
              <a
                className="secondaryButton"
                aria-disabled={page <= 1}
                href={page > 1 ? pageHref(page - 1) : pageHref(1)}
              >
                Previous
              </a>
              <a
                className="secondaryButton"
                aria-disabled={page >= totalPages}
                href={page < totalPages ? pageHref(page + 1) : pageHref(totalPages)}
              >
                Next
              </a>
            </div>
          </div>
          <AuthAuditMobileCards items={items} />
          <AuthAuditTabletRows items={items} />
          <AuthAuditDesktopTable items={items} />
        </section>
      </>
    </WorkspaceLayout>
  );
}
