import Link from 'next/link';

import { getConsumers } from '../../../lib/admin-api.server';

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

export default async function ConsumersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    page?: string;
    accountType?: string;
    contractorKind?: string;
    verificationStatus?: string;
    includeDeleted?: string;
  }>;
}) {
  const params = await searchParams;
  const page = params?.page ? Number(params.page) : 1;
  const q = params?.q?.trim() ?? ``;
  const accountType = params?.accountType?.trim() ?? ``;
  const contractorKind = params?.contractorKind?.trim() ?? ``;
  const verificationStatus = params?.verificationStatus?.trim() ?? ``;
  const includeDeleted = params?.includeDeleted === `true`;
  const data = await getConsumers({ page, q, accountType, contractorKind, verificationStatus, includeDeleted });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function pageHref(nextPage: number) {
    const query = new URLSearchParams();
    if (q) query.set(`q`, q);
    if (accountType) query.set(`accountType`, accountType);
    if (contractorKind) query.set(`contractorKind`, contractorKind);
    if (verificationStatus) query.set(`verificationStatus`, verificationStatus);
    if (includeDeleted) query.set(`includeDeleted`, `true`);
    query.set(`page`, String(nextPage));
    return `/consumers?${query.toString()}`;
  }

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>Consumers</h1>
          <p className="muted">Consumer investigation surface with notes, flags and audit drilldowns.</p>
        </div>
        <form method="get" className="actionsRow">
          <input name="q" defaultValue={q} placeholder="Search by email, name or id" />
          <select name="verificationStatus" defaultValue={verificationStatus}>
            <option value="">All verification states</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="MORE_INFO">MORE_INFO</option>
            <option value="REJECTED">REJECTED</option>
            <option value="FLAGGED">FLAGGED</option>
          </select>
          <select name="accountType" defaultValue={accountType}>
            <option value="">All account types</option>
            <option value="BUSINESS">BUSINESS</option>
            <option value="CONTRACTOR">CONTRACTOR</option>
          </select>
          <select name="contractorKind" defaultValue={contractorKind}>
            <option value="">All contractor kinds</option>
            <option value="ENTITY">ENTITY</option>
            <option value="INDIVIDUAL">INDIVIDUAL</option>
          </select>
          <label className="muted">
            <input name="includeDeleted" type="checkbox" value="true" defaultChecked={includeDeleted} /> Include deleted
          </label>
          <button className="secondaryButton" type="submit">
            Apply
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="pageHeader">
          <div>
            <h2>Consumer queue</h2>
            <p className="muted">
              {data?.total ?? 0} results · page {data?.page ?? 1} / {totalPages}
            </p>
          </div>
          <div className="actionsRow">
            <Link
              className="secondaryButton"
              aria-disabled={page <= 1}
              href={page > 1 ? pageHref(page - 1) : pageHref(1)}
            >
              Previous
            </Link>
            <Link
              className="secondaryButton"
              aria-disabled={page >= totalPages}
              href={page < totalPages ? pageHref(page + 1) : pageHref(totalPages)}
            >
              Next
            </Link>
          </div>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Consumer</th>
                <th>Type</th>
                <th>Verification</th>
                <th>Flags</th>
                <th>Notes</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((consumer) => (
                <tr key={consumer.id}>
                  <td>
                    <Link href={`/consumers/${consumer.id}`}>
                      <strong>{consumer.displayName ?? consumer.email}</strong>
                    </Link>
                    <div className="muted">{consumer.email}</div>
                    <div className="muted mono">{consumer.id}</div>
                  </td>
                  <td>
                    <div>{consumer.accountType}</div>
                    <div className="muted">{consumer.contractorKind ?? `-`}</div>
                    <div className="muted">{consumer.deletedAt ? `Deleted` : `Active`}</div>
                  </td>
                  <td>
                    <div>{consumer.verificationStatus}</div>
                    <div className="muted">{consumer.stripeIdentityStatus ?? `No Stripe state`}</div>
                  </td>
                  <td>
                    <div className="pillRow">
                      {consumer.adminFlags.length > 0 ? (
                        consumer.adminFlags.map((flag) => (
                          <span key={flag.id} className="pill">
                            {flag.flag}
                          </span>
                        ))
                      ) : (
                        <span className="muted">No active flags</span>
                      )}
                    </div>
                  </td>
                  <td>{consumer._count.adminNotes}</td>
                  <td>{formatDate(consumer.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
