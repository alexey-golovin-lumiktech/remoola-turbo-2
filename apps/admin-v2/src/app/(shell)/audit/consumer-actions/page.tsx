import Link from 'next/link';

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
import { getConsumerActionAudit } from '../../../../lib/admin-api.server';
import { formatDateTime, getDefaultLookbackIsoRange } from '../../../../lib/admin-format';

type ConsumerActionRow = Record<string, unknown>;

function renderConsumerLink(item: ConsumerActionRow) {
  if (typeof item.consumerId === `string`) {
    return <Link href={`/consumers/${item.consumerId}`}>{item.consumerId}</Link>;
  }
  return `-`;
}

function ConsumerActionsMobileCards({ items }: { items: ConsumerActionRow[] }) {
  if (items.length === 0) {
    return (
      <div className="readSurface md:hidden" data-view="mobile">
        <div className="panel muted">No consumer actions match the current filters.</div>
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
            subtitle={<span className="mono">{renderConsumerLink(item)}</span>}
          >
            <div>
              {String(item.resource ?? `-`)}
              {` `}
              <span className="muted mono">{String(item.resourceId ?? `-`)}</span>
            </div>
            <div className="muted mono">{JSON.stringify(item.metadata ?? {})}</div>
            <div className="muted">
              Created: {formatDateTime(typeof item.createdAt === `string` ? item.createdAt : null)}
            </div>
          </MobileQueueCard>
        ))}
      </div>
    </div>
  );
}

function ConsumerActionsTabletRows({ items }: { items: ConsumerActionRow[] }) {
  if (items.length === 0) {
    return (
      <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
        <div className="panel muted">No consumer actions match the current filters.</div>
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
                <div className="muted mono">{renderConsumerLink(item)}</div>
              </>
            }
            cells={[
              <div key="resource">
                {String(item.resource ?? `-`)}
                <div className="muted mono">{String(item.resourceId ?? `-`)}</div>
              </div>,
              <div className="muted mono" key="metadata">
                {JSON.stringify(item.metadata ?? {})}
              </div>,
              <div className="muted" key="created">
                {formatDateTime(typeof item.createdAt === `string` ? item.createdAt : null)}
              </div>,
              null,
            ]}
          />
        ))}
      </div>
    </div>
  );
}

function ConsumerActionsDesktopTable({ items }: { items: ConsumerActionRow[] }) {
  return (
    <div className="readSurface hidden xl:block" data-view="desktop">
      <DenseTable
        headers={[`Consumer`, `Action`, `Resource`, `Metadata`, `Created`]}
        emptyMessage="No consumer actions match the current filters."
      >
        {items.length === 0
          ? null
          : items.map((item, index) => (
              <tr key={String(item.id ?? index)}>
                <td className="mono">{renderConsumerLink(item)}</td>
                <td>{String(item.action ?? `-`)}</td>
                <td>
                  {String(item.resource ?? `-`)}
                  <div className="muted mono">{String(item.resourceId ?? `-`)}</div>
                </td>
                <td className="mono">{JSON.stringify(item.metadata ?? {})}</td>
                <td>{formatDateTime(typeof item.createdAt === `string` ? item.createdAt : null)}</td>
              </tr>
            ))}
      </DenseTable>
    </div>
  );
}

export default async function AuditConsumerActionsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    consumerId?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = params?.page ? Number(params.page) : 1;
  const data = await getConsumerActionAudit({
    consumerId: params?.consumerId,
    action: params?.action,
    dateFrom: params?.dateFrom,
    dateTo: params?.dateTo,
    page,
  });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function pageHref(nextPage: number) {
    const query = new URLSearchParams();
    if (params?.consumerId?.trim()) query.set(`consumerId`, params.consumerId.trim());
    if (params?.action?.trim()) query.set(`action`, params.action.trim());
    const { dateFrom, dateTo } = getDefaultLookbackIsoRange();
    query.set(`dateFrom`, params?.dateFrom ?? dateFrom);
    query.set(`dateTo`, params?.dateTo ?? dateTo);
    query.set(`page`, String(nextPage));
    return `/audit/consumer-actions?${query.toString()}`;
  }

  const items = (data?.items ?? []) as Array<Record<string, unknown>> as ConsumerActionRow[];

  return (
    <WorkspaceLayout workspace="audit/consumer-actions">
      <>
        <Panel
          title="Audit / Consumer Actions"
          description="Time-bounded consumer action log explorer. Default range is the last 7 days."
        >
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" method="get">
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Consumer id</span>
              <input
                className={textInputClass}
                name="consumerId"
                defaultValue={params?.consumerId ?? ``}
                placeholder="consumer id"
              />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Action</span>
              <input
                className={textInputClass}
                name="action"
                defaultValue={params?.action ?? ``}
                placeholder="action"
              />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Date from</span>
              <input
                className={textInputClass}
                name="dateFrom"
                defaultValue={params?.dateFrom ?? getDefaultLookbackIsoRange().dateFrom}
                placeholder="dateFrom"
              />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Date to</span>
              <input
                className={textInputClass}
                name="dateTo"
                defaultValue={params?.dateTo ?? getDefaultLookbackIsoRange().dateTo}
                placeholder="dateTo"
              />
            </label>
            <div className={buttonRowClass}>
              <button className={ghostButtonClass} type="submit">
                Apply
              </button>
              <a className={ghostButtonClass} href="/audit/consumer-actions">
                Reset
              </a>
            </div>
          </form>
        </Panel>
        <Panel
          title="Consumer actions"
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
          <ConsumerActionsMobileCards items={items} />
          <ConsumerActionsTabletRows items={items} />
          <ConsumerActionsDesktopTable items={items} />
        </Panel>
      </>
    </WorkspaceLayout>
  );
}
