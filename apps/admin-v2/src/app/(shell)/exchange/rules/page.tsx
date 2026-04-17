import Link from 'next/link';

import { getExchangeRules } from '../../../../lib/admin-api.server';

function formatDate(value: string | null | undefined) {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

function renderExecutionSummary(value: Record<string, unknown> | null) {
  if (!value) return `No persisted execution summary`;
  return `${String(value.status ?? `unknown`)} · ${String(value.reason ?? `-`)}`;
}

export default async function ExchangeRulesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    page?: string;
    q?: string;
    enabled?: string;
    fromCurrency?: string;
    toCurrency?: string;
  }>;
}) {
  const params = await searchParams;
  const page = params?.page ? Number(params.page) : 1;
  const q = params?.q?.trim() ?? ``;
  const enabled = params?.enabled?.trim() ?? ``;
  const fromCurrency = params?.fromCurrency?.trim() ?? ``;
  const toCurrency = params?.toCurrency?.trim() ?? ``;

  const data = await getExchangeRules({
    page,
    q,
    enabled: enabled === `` ? undefined : enabled === `true`,
    fromCurrency,
    toCurrency,
  });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function pageHref(nextPage: number) {
    const query = new URLSearchParams();
    if (q) query.set(`q`, q);
    if (enabled) query.set(`enabled`, enabled);
    if (fromCurrency) query.set(`fromCurrency`, fromCurrency);
    if (toCurrency) query.set(`toCurrency`, toCurrency);
    query.set(`page`, String(nextPage));
    return `/exchange/rules?${query.toString()}`;
  }

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>Auto-conversion rules</h1>
          <p className="muted">
            Per-consumer thresholds, enabled state, timing context and the latest persisted execution result/error.
          </p>
        </div>
        <div className="actionsRow">
          <Link className="secondaryButton" href="/exchange">
            Exchange workspace
          </Link>
          <Link className="secondaryButton" href="/exchange/scheduled">
            Scheduled conversions
          </Link>
        </div>
      </section>

      <section className="panel">
        <form method="get" className="actionsRow">
          <input name="q" defaultValue={q} placeholder="Consumer id or email" />
          <select name="enabled" defaultValue={enabled}>
            <option value="">All rule states</option>
            <option value="true">Enabled only</option>
            <option value="false">Paused only</option>
          </select>
          <input name="fromCurrency" defaultValue={fromCurrency} placeholder="From currency" />
          <input name="toCurrency" defaultValue={toCurrency} placeholder="To currency" />
          <button className="secondaryButton" type="submit">
            Apply
          </button>
          <Link className="secondaryButton" href="/exchange/rules">
            Clear
          </Link>
        </form>
      </section>

      <section className="panel">
        <div className="pageHeader">
          <div>
            <h2>Rules list</h2>
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
                <th>Rule</th>
                <th>Consumer</th>
                <th>Thresholds</th>
                <th>State</th>
                <th>Latest result</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link href={`/exchange/rules/${item.id}`}>
                      <strong>
                        {item.sourceCurrency}/{item.targetCurrency}
                      </strong>
                    </Link>
                    <div className="muted mono">{item.id}</div>
                  </td>
                  <td>
                    <Link href={`/consumers/${item.consumer.id}`}>{item.consumer.email ?? item.consumer.id}</Link>
                    <div className="muted mono">{item.consumer.id}</div>
                  </td>
                  <td>
                    <div>Target balance: {item.threshold}</div>
                    <div className="muted">Max convert: {item.maxConvertAmount ?? `-`}</div>
                    <div className="muted">Interval: {item.minIntervalMinutes} min</div>
                  </td>
                  <td>
                    <div>{item.enabled ? `Enabled` : `Paused`}</div>
                    <div className="muted">Last run: {formatDate(item.lastRunAt)}</div>
                    <div className="muted">Next run: {formatDate(item.nextRunAt)}</div>
                  </td>
                  <td>
                    <div>{renderExecutionSummary(item.lastExecution)}</div>
                    <div className="muted">
                      Updated: {formatDate(item.updatedAt)} · Version: {item.version}
                    </div>
                  </td>
                </tr>
              ))}
              {(data?.items ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5}>No exchange rules found for the current filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
