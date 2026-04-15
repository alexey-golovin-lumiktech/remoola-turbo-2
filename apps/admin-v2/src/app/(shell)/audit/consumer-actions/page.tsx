import Link from 'next/link';

import { getConsumerActionAudit } from '../../../../lib/admin-api.server';

function formatDate(value: unknown): string {
  if (typeof value !== `string`) return `-`;
  return new Date(value).toLocaleString();
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
    query.set(`dateFrom`, params?.dateFrom ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    query.set(`dateTo`, params?.dateTo ?? new Date().toISOString());
    query.set(`page`, String(nextPage));
    return `/audit/consumer-actions?${query.toString()}`;
  }

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>Audit / Consumer Actions</h1>
          <p className="muted">Time-bounded consumer action log explorer. Default range is the last 7 days.</p>
        </div>
        <form className="actionsRow" method="get">
          <input name="consumerId" defaultValue={params?.consumerId ?? ``} placeholder="consumer id" />
          <input name="action" defaultValue={params?.action ?? ``} placeholder="action" />
          <input
            name="dateFrom"
            defaultValue={params?.dateFrom ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}
            placeholder="dateFrom"
          />
          <input name="dateTo" defaultValue={params?.dateTo ?? new Date().toISOString()} placeholder="dateTo" />
          <button className="secondaryButton" type="submit">
            Apply
          </button>
        </form>
      </section>
      <section className="panel tableWrap">
        <div className="pageHeader">
          <p className="muted">
            {data?.total ?? 0} results · page {data?.page ?? 1} / {totalPages}
          </p>
          <div className="actionsRow">
            <a className="secondaryButton" aria-disabled={page <= 1} href={page > 1 ? pageHref(page - 1) : pageHref(1)}>
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
        <table>
          <thead>
            <tr>
              <th>Consumer</th>
              <th>Action</th>
              <th>Resource</th>
              <th>Metadata</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {((data?.items ?? []) as Array<Record<string, unknown>>).map((item, index) => (
              <tr key={String(item.id ?? index)}>
                <td className="mono">
                  {typeof item.consumerId === `string` ? (
                    <Link href={`/consumers/${item.consumerId}`}>{item.consumerId}</Link>
                  ) : (
                    `-`
                  )}
                </td>
                <td>{String(item.action ?? `-`)}</td>
                <td>
                  {String(item.resource ?? `-`)}
                  <div className="muted mono">{String(item.resourceId ?? `-`)}</div>
                </td>
                <td className="mono">{JSON.stringify(item.metadata ?? {})}</td>
                <td>{formatDate(item.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
