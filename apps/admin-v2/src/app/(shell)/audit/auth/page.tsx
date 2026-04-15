import { getAuthAudit } from '../../../../lib/admin-api.server';

function formatDate(value: unknown): string {
  if (typeof value !== `string`) return `-`;
  return new Date(value).toLocaleString();
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

  return (
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
              <th>Email</th>
              <th>Event</th>
              <th>IP</th>
              <th>User agent</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((item, index) => (
              <tr key={String(item.id ?? index)}>
                <td>{String(item.email ?? `-`)}</td>
                <td>{String(item.event ?? `-`)}</td>
                <td>{String(item.ipAddress ?? `-`)}</td>
                <td>{String(item.userAgent ?? `-`)}</td>
                <td>{formatDate(item.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
