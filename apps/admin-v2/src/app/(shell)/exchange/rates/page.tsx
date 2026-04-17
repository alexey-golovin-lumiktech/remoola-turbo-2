import Link from 'next/link';

import { getExchangeRates } from '../../../../lib/admin-api.server';

function formatDate(value: string | null | undefined) {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

export default async function ExchangeRatesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    page?: string;
    fromCurrency?: string;
    toCurrency?: string;
    provider?: string;
    status?: string;
    stale?: string;
  }>;
}) {
  const params = await searchParams;
  const page = params?.page ? Number(params.page) : 1;
  const fromCurrency = params?.fromCurrency?.trim() ?? ``;
  const toCurrency = params?.toCurrency?.trim() ?? ``;
  const provider = params?.provider?.trim() ?? ``;
  const status = params?.status?.trim() ?? ``;
  const stale = params?.stale === `true`;

  const data = await getExchangeRates({
    page,
    fromCurrency,
    toCurrency,
    provider,
    status,
    stale,
  });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function pageHref(nextPage: number) {
    const query = new URLSearchParams();
    if (fromCurrency) query.set(`fromCurrency`, fromCurrency);
    if (toCurrency) query.set(`toCurrency`, toCurrency);
    if (provider) query.set(`provider`, provider);
    if (status) query.set(`status`, status);
    if (stale) query.set(`stale`, `true`);
    query.set(`page`, String(nextPage));
    return `/exchange/rates?${query.toString()}`;
  }

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>Exchange rates</h1>
          <p className="muted">
            Current and historical rates with explicit approval posture, spread/confidence visibility and staleness
            indicators.
          </p>
        </div>
        <div className="actionsRow">
          <Link className="secondaryButton" href="/exchange">
            Exchange workspace
          </Link>
          <Link className="secondaryButton" href="/exchange/scheduled?status=FAILED">
            Failed scheduled FX
          </Link>
        </div>
      </section>

      <section className="panel">
        <form method="get" className="actionsRow">
          <input name="fromCurrency" defaultValue={fromCurrency} placeholder="From currency" />
          <input name="toCurrency" defaultValue={toCurrency} placeholder="To currency" />
          <input name="provider" defaultValue={provider} placeholder="Provider" />
          <select name="status" defaultValue={status}>
            <option value="">All statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="APPROVED">APPROVED</option>
            <option value="DISABLED">DISABLED</option>
          </select>
          <label className="muted">
            <input name="stale" type="checkbox" value="true" defaultChecked={stale} /> Stale only
          </label>
          <button className="secondaryButton" type="submit">
            Apply
          </button>
          <Link className="secondaryButton" href="/exchange/rates">
            Clear
          </Link>
        </form>
      </section>

      <section className="panel">
        <div className="pageHeader">
          <div>
            <h2>Rates list</h2>
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
                <th>Pair</th>
                <th>Rate</th>
                <th>Status</th>
                <th>Provider</th>
                <th>Staleness</th>
                <th>Effective</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link href={`/exchange/rates/${item.id}`}>
                      <strong>
                        {item.sourceCurrency}/{item.targetCurrency}
                      </strong>
                    </Link>
                    <div className="muted mono">{item.id}</div>
                  </td>
                  <td>
                    <div>{item.rate}</div>
                    <div className="muted">Inverse: {item.inverseRate ?? `-`}</div>
                    <div className="muted">
                      Spread: {item.spreadBps ?? `-`} bps · Confidence: {item.confidence ?? `-`}
                    </div>
                  </td>
                  <td>
                    <div>{item.status}</div>
                    <div className="muted">Approved: {formatDate(item.approvedAt)}</div>
                  </td>
                  <td>
                    <div>{item.provider ?? `-`}</div>
                    <div className="muted">Fetched: {formatDate(item.fetchedAt)}</div>
                  </td>
                  <td>
                    <div>{item.stalenessIndicator.isStale ? `Stale` : `Fresh`}</div>
                    <div className="muted">
                      Reference: {formatDate(item.stalenessIndicator.referenceAt)} ·{` `}
                      {item.stalenessIndicator.ageMinutes}m
                    </div>
                  </td>
                  <td>
                    <div>{formatDate(item.effectiveAt)}</div>
                    <div className="muted">Expires: {formatDate(item.expiresAt)}</div>
                  </td>
                </tr>
              ))}
              {(data?.items ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6}>No exchange rates found for the current filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
