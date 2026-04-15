import Link from 'next/link';

import { getAdminActionAudit } from '../../../../lib/admin-api.server';

function formatDate(value: unknown): string {
  if (typeof value !== `string`) return `-`;
  return new Date(value).toLocaleString();
}

export default async function AuditAdminActionsPage({
  searchParams,
}: {
  searchParams?: Promise<{
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
  const data = await getAdminActionAudit({
    action: params?.action,
    adminId: params?.adminId,
    email: params?.email,
    resourceId: params?.resourceId,
    dateFrom: params?.dateFrom,
    dateTo: params?.dateTo,
    page,
  });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function pageHref(nextPage: number) {
    const query = new URLSearchParams();
    if (params?.action?.trim()) query.set(`action`, params.action.trim());
    if (params?.adminId?.trim()) query.set(`adminId`, params.adminId.trim());
    if (params?.email?.trim()) query.set(`email`, params.email.trim());
    if (params?.resourceId?.trim()) query.set(`resourceId`, params.resourceId.trim());
    if (params?.dateFrom?.trim()) query.set(`dateFrom`, params.dateFrom.trim());
    if (params?.dateTo?.trim()) query.set(`dateTo`, params.dateTo.trim());
    query.set(`page`, String(nextPage));
    return `/audit/admin-actions?${query.toString()}`;
  }

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>Audit / Admin Actions</h1>
          <p className="muted">
            Append-only admin action trail for consumers notes, flags and later workspace actions.
          </p>
        </div>
        <form className="actionsRow" method="get">
          <input name="action" defaultValue={params?.action ?? ``} placeholder="action" />
          <input name="email" defaultValue={params?.email ?? ``} placeholder="admin email" />
          <input name="resourceId" defaultValue={params?.resourceId ?? ``} placeholder="resource id" />
          <input name="dateFrom" defaultValue={params?.dateFrom ?? ``} placeholder="dateFrom" />
          <input name="dateTo" defaultValue={params?.dateTo ?? ``} placeholder="dateTo" />
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
              <th>Action</th>
              <th>Resource</th>
              <th>Admin</th>
              <th>Metadata</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {((data?.items ?? []) as Array<Record<string, unknown>>).map((item, index) => (
              <tr key={String(item.id ?? index)}>
                <td>{String(item.action ?? `-`)}</td>
                <td>
                  {String(item.resource ?? `-`)}
                  <div className="muted mono">
                    {String(item.resource ?? ``) === `consumer` && typeof item.resourceId === `string` ? (
                      <Link href={`/consumers/${item.resourceId}`}>{item.resourceId}</Link>
                    ) : (
                      String(item.resourceId ?? `-`)
                    )}
                  </div>
                </td>
                <td>{String(item.adminEmail ?? item.adminId ?? `-`)}</td>
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
