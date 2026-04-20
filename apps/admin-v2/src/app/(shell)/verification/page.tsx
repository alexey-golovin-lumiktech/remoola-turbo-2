import Link from 'next/link';

import { getVerificationQueue } from '../../../lib/admin-api.server';

export default async function VerificationQueuePage({
  searchParams,
}: {
  searchParams?: Promise<{
    page?: string;
    status?: string;
    stripeIdentityStatus?: string;
    country?: string;
    contractorKind?: string;
    missingProfileData?: string;
    missingDocuments?: string;
  }>;
}) {
  const params = await searchParams;
  const page = params?.page ? Number(params.page) : 1;
  const queue = await getVerificationQueue({
    page,
    status: params?.status,
    stripeIdentityStatus: params?.stripeIdentityStatus,
    country: params?.country,
    contractorKind: params?.contractorKind,
    missingProfileData: params?.missingProfileData === `true`,
    missingDocuments: params?.missingDocuments === `true`,
  });
  const totalPages = queue ? Math.max(1, Math.ceil(queue.total / queue.pageSize)) : 1;

  function pageHref(nextPage: number) {
    const query = new URLSearchParams();
    if (params?.status?.trim()) query.set(`status`, params.status.trim());
    if (params?.stripeIdentityStatus?.trim()) query.set(`stripeIdentityStatus`, params.stripeIdentityStatus.trim());
    if (params?.country?.trim()) query.set(`country`, params.country.trim());
    if (params?.contractorKind?.trim()) query.set(`contractorKind`, params.contractorKind.trim());
    if (params?.missingProfileData === `true`) query.set(`missingProfileData`, `true`);
    if (params?.missingDocuments === `true`) query.set(`missingDocuments`, `true`);
    query.set(`page`, String(nextPage));
    return `/verification?${query.toString()}`;
  }

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>Verification Queue</h1>
          <p className="muted">Verification queue for canonical review states: PENDING, MORE_INFO and FLAGGED.</p>
        </div>
        <p className="muted">
          SLA breached: {queue?.sla.breachedCount ?? 0} · threshold {queue?.sla.thresholdHours ?? 24}h
        </p>
      </section>

      <section className="panel pageHeader">
        <form className="actionsRow" method="get">
          <input name="status" defaultValue={params?.status ?? ``} placeholder="status" />
          <input
            name="stripeIdentityStatus"
            defaultValue={params?.stripeIdentityStatus ?? ``}
            placeholder="stripe status"
          />
          <input name="country" defaultValue={params?.country ?? ``} placeholder="country" />
          <input name="contractorKind" defaultValue={params?.contractorKind ?? ``} placeholder="contractor kind" />
          <label className="field">
            <span>Missing profile</span>
            <input
              type="checkbox"
              name="missingProfileData"
              value="true"
              defaultChecked={params?.missingProfileData === `true`}
            />
          </label>
          <label className="field">
            <span>Missing docs</span>
            <input
              type="checkbox"
              name="missingDocuments"
              value="true"
              defaultChecked={params?.missingDocuments === `true`}
            />
          </label>
          <button className="secondaryButton" type="submit">
            Apply
          </button>
        </form>
      </section>

      <section className="panel tableWrap">
        <div className="pageHeader">
          <p className="muted">
            {queue?.total ?? 0} results · page {queue?.page ?? 1} / {totalPages}
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
              <th>Status</th>
              <th>Profile</th>
              <th>Docs</th>
              <th>SLA</th>
              <th>Assigned to</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {(queue?.items ?? []).map((item) => (
              <tr key={item.id}>
                <td>
                  <Link href={`/verification/${item.id}`}>{item.email}</Link>
                  <div className="muted mono">{item.id}</div>
                </td>
                <td>
                  {item.verificationStatus}
                  <div className="muted">{item.stripeIdentityStatus ?? `-`}</div>
                </td>
                <td>
                  {item.accountType}
                  <div className="muted">{item.country ?? `-`}</div>
                  <div className="muted">{item.missingProfileData ? `Missing profile data` : `Profile ready`}</div>
                </td>
                <td>{item.missingDocuments ? `Missing documents` : `${item.documentsCount} attached`}</td>
                <td>{item.slaBreached ? `Breached` : `Within SLA`}</td>
                <td>
                  {item.assignedTo ? (
                    <>
                      <div>{item.assignedTo.name ?? item.assignedTo.email ?? item.assignedTo.id}</div>
                      {item.assignedTo.email ? <div className="muted">{item.assignedTo.email}</div> : null}
                    </>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>{new Date(item.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
