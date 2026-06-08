import { adminV2AuditListQuerySchema } from '@remoola/api-types';

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
import { getAuthAudit } from '../../../../lib/admin-api/audit.server';
import { formatDateTime, EMPTY_VALUE } from '../../../../lib/admin-format';
import { buildListPageHref } from '../../../../lib/list-page';
import { dateSearchParam, positiveIntegerSearchParam, trimmedSearchParam } from '../../../../lib/query-contract';

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
            title={String(item.event ?? EMPTY_VALUE)}
            subtitle={String(item.email ?? EMPTY_VALUE)}
          >
            <div className="muted">IP: {String(item.ipAddress ?? EMPTY_VALUE)}</div>
            <div className="muted">UA: {String(item.userAgent ?? EMPTY_VALUE)}</div>
            <div className="muted">Created: {formatDateTime(item.createdAt)}</div>
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
                <strong>{String(item.event ?? EMPTY_VALUE)}</strong>
                <div className="muted">{String(item.email ?? EMPTY_VALUE)}</div>
              </>
            }
            cells={[
              <div className="muted" key="ip">
                IP: {String(item.ipAddress ?? EMPTY_VALUE)}
              </div>,
              <div className="muted" key="ua">
                UA: {String(item.userAgent ?? EMPTY_VALUE)}
              </div>,
              <div className="muted" key="created">
                Created: {formatDateTime(item.createdAt)}
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
                <td>{String(item.email ?? EMPTY_VALUE)}</td>
                <td>{String(item.event ?? EMPTY_VALUE)}</td>
                <td>{String(item.ipAddress ?? EMPTY_VALUE)}</td>
                <td>{String(item.userAgent ?? EMPTY_VALUE)}</td>
                <td>{formatDateTime(item.createdAt)}</td>
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
  const query = adminV2AuditListQuerySchema.parse({
    page: positiveIntegerSearchParam(params?.page, 1),
    email: trimmedSearchParam(params?.email),
    event: trimmedSearchParam(params?.event),
    ipAddress: trimmedSearchParam(params?.ipAddress),
    dateFrom: dateSearchParam(params?.dateFrom),
    dateTo: dateSearchParam(params?.dateTo),
  });
  const page = query.page ?? 1;
  const data = await getAuthAudit({
    email: query.email,
    event: query.event,
    ipAddress: query.ipAddress,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    page,
  });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function pageHref(nextPage: number) {
    return buildListPageHref(`/audit/auth`, query, `page`, nextPage);
  }

  const items: AuthAuditRow[] = (data?.items ?? []) as AuthAuditRow[];

  return (
    <WorkspaceLayout workspace="audit/auth">
      <>
        <Panel
          title="Audit / Auth"
          description="Searchable admin auth audit for login, refresh and logout reconstruction."
        >
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" method="get">
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Admin email</span>
              <input
                className={textInputClass}
                name="email"
                defaultValue={query.email ?? ``}
                placeholder="admin email"
              />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Event</span>
              <input className={textInputClass} name="event" defaultValue={query.event ?? ``} placeholder="event" />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>IP or prefix</span>
              <input
                className={textInputClass}
                name="ipAddress"
                defaultValue={query.ipAddress ?? ``}
                placeholder="ip or prefix"
              />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Date from</span>
              <input
                className={textInputClass}
                name="dateFrom"
                defaultValue={query.dateFrom ?? ``}
                placeholder="2026-04-15T00:00:00Z"
              />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Date to</span>
              <input
                className={textInputClass}
                name="dateTo"
                defaultValue={query.dateTo ?? ``}
                placeholder="2026-04-15T23:59:59Z"
              />
            </label>
            <div className={buttonRowClass}>
              <button className={ghostButtonClass} type="submit">
                Apply
              </button>
              <a className={ghostButtonClass} href="/audit/auth">
                Reset
              </a>
            </div>
          </form>
        </Panel>
        <Panel
          title="Auth events"
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
          <AuthAuditMobileCards items={items} />
          <AuthAuditTabletRows items={items} />
          <AuthAuditDesktopTable items={items} />
        </Panel>
      </>
    </WorkspaceLayout>
  );
}
