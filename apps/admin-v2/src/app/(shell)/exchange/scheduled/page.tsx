import Link from 'next/link';

import { getExchangeScheduledConversions } from '../../../../lib/admin-api.server';

function formatDate(value: string | null | undefined) {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

export default async function ExchangeScheduledPage({
  searchParams,
}: {
  searchParams?: Promise<{
    page?: string;
    q?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;
  const page = params?.page ? Number(params.page) : 1;
  const q = params?.q?.trim() ?? ``;
  const status = params?.status?.trim() ?? ``;

  const data = await getExchangeScheduledConversions({
    page,
    q,
    status,
  });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function pageHref(nextPage: number) {
    const query = new URLSearchParams();
    if (q) query.set(`q`, q);
    if (status) query.set(`status`, status);
    query.set(`page`, String(nextPage));
    return `/exchange/scheduled?${query.toString()}`;
  }

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>Scheduled conversions</h1>
          <p className="muted">
            Status views with attempts, retry count, timing visibility, failure detail and linked consumer/ledger
            context.
          </p>
        </div>
        <div className="actionsRow">
          <Link className="secondaryButton" href="/exchange">
            Exchange workspace
          </Link>
          <Link className="secondaryButton" href="/exchange/rates?stale=true">
            Stale rates
          </Link>
        </div>
      </section>

      <section className="panel">
        <form method="get" className="actionsRow">
          <input name="q" defaultValue={q} placeholder="Consumer id, email, conversion id or ledger id" />
          <select name="status" defaultValue={status}>
            <option value="">All statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="FAILED">FAILED</option>
            <option value="EXECUTED">EXECUTED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
          <button className="secondaryButton" type="submit">
            Apply
          </button>
          <Link className="secondaryButton" href="/exchange/scheduled">
            Clear
          </Link>
        </form>
      </section>

      <section className="panel">
        <div className="pageHeader">
          <div>
            <h2>Queue</h2>
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
                <th>Conversion</th>
                <th>Consumer</th>
                <th>Status</th>
                <th>Assigned to</th>
                <th>Timing</th>
                <th>Failure / ledger</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link href={`/exchange/scheduled/${item.id}`}>
                      <strong>
                        {item.sourceCurrency}/{item.targetCurrency}
                      </strong>
                    </Link>
                    <div className="muted mono">{item.id}</div>
                    <div className="muted">
                      {item.amount} · attempts {item.attempts} · retry count {item.retryCount}
                    </div>
                  </td>
                  <td>
                    <Link href={`/consumers/${item.consumer.id}`}>{item.consumer.email ?? item.consumer.id}</Link>
                    <div className="muted mono">{item.consumer.id}</div>
                  </td>
                  <td>
                    <div>{item.status}</div>
                    <div className="muted">Rule link: {item.linkedRuleId ?? `-`}</div>
                  </td>
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
                  <td>
                    <div>Execute at: {formatDate(item.executeAt)}</div>
                    <div className="muted">Processing: {formatDate(item.processingAt)}</div>
                    <div className="muted">Executed: {formatDate(item.executedAt)}</div>
                    <div className="muted">Failed: {formatDate(item.failedAt)}</div>
                  </td>
                  <td>
                    <div>{item.failureDetail ?? `No failure detail`}</div>
                    <div className="muted">Ledger id: {item.ledgerId ?? `-`}</div>
                    <div className="muted">Linked entry: {item.linkedLedgerEntry?.id ?? `-`}</div>
                  </td>
                </tr>
              ))}
              {(data?.items ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6}>No scheduled conversions found for the current filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
