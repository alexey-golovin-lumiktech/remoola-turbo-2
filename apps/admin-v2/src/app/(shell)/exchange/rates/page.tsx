import Link from 'next/link';

import { DenseTable } from '../../../../components/dense-table';
import { MobileQueueCard } from '../../../../components/mobile-queue-card';
import { StatusPill } from '../../../../components/status-pill';
import { TabletRow } from '../../../../components/tablet-row';
import { WorkspaceLayout } from '../../../../components/workspace-layout';
import { type ExchangeRatesListResponse, getExchangeRates } from '../../../../lib/admin-api.server';

type ExchangeRateItem = ExchangeRatesListResponse[`items`][number];

function formatDate(value: string | null | undefined) {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

function RatesMobileCards({ items }: { items: ExchangeRateItem[] }) {
  if (items.length === 0) {
    return (
      <div className="readSurface md:hidden" data-view="mobile">
        <div className="panel muted">No exchange rates found for the current filters.</div>
      </div>
    );
  }

  return (
    <div className="readSurface md:hidden" data-view="mobile">
      <div className="queueCards">
        {items.map((item) => (
          <MobileQueueCard
            key={item.id}
            id={item.id}
            href={`/exchange/rates/${item.id}`}
            title={`${item.sourceCurrency}/${item.targetCurrency}`}
            subtitle={<span className="mono">{item.id}</span>}
          >
            <div>Rate: {item.rate}</div>
            <div className="muted">Inverse: {item.inverseRate ?? `-`}</div>
            <div className="muted">
              Spread: {item.spreadBps ?? `-`} bps · Confidence: {item.confidence ?? `-`}
            </div>
            <div>
              <StatusPill status={item.status} />
            </div>
            <div className="muted">Approved: {formatDate(item.approvedAt)}</div>
            <div className="muted">Provider: {item.provider ?? `-`}</div>
            <div className="muted">Fetched: {formatDate(item.fetchedAt)}</div>
            <div className="muted">
              {item.stalenessIndicator.isStale ? `Stale` : `Fresh`} · {item.stalenessIndicator.ageMinutes}m
            </div>
            <div className="muted">Effective: {formatDate(item.effectiveAt)}</div>
            <div className="muted">Expires: {formatDate(item.expiresAt)}</div>
          </MobileQueueCard>
        ))}
      </div>
    </div>
  );
}

function RatesTabletRows({ items }: { items: ExchangeRateItem[] }) {
  if (items.length === 0) {
    return (
      <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
        <div className="panel muted">No exchange rates found for the current filters.</div>
      </div>
    );
  }

  return (
    <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
      <div className="condensedList">
        {items.map((item) => (
          <TabletRow
            key={item.id}
            primary={
              <>
                <Link href={`/exchange/rates/${item.id}`}>
                  <strong>
                    {item.sourceCurrency}/{item.targetCurrency}
                  </strong>
                </Link>
                <div className="muted mono">{item.id}</div>
              </>
            }
            cells={[
              <div key="rate">
                <div>{item.rate}</div>
                <div className="muted">Inv: {item.inverseRate ?? `-`}</div>
              </div>,
              <div key="status">
                <StatusPill status={item.status} />
                <div className="muted">{item.provider ?? `-`}</div>
              </div>,
              <div key="staleness">
                <div>{item.stalenessIndicator.isStale ? `Stale` : `Fresh`}</div>
                <div className="muted">{item.stalenessIndicator.ageMinutes}m</div>
              </div>,
              <div key="effective">
                <div>Eff: {formatDate(item.effectiveAt)}</div>
                <div className="muted">Exp: {formatDate(item.expiresAt)}</div>
              </div>,
            ]}
          />
        ))}
      </div>
    </div>
  );
}

function RatesDesktopTable({ items }: { items: ExchangeRateItem[] }) {
  return (
    <div className="readSurface hidden xl:block" data-view="desktop">
      <DenseTable
        headers={[`Pair`, `Rate`, `Status`, `Provider`, `Staleness`, `Effective`]}
        emptyMessage="No exchange rates found for the current filters."
      >
        {items.length === 0
          ? null
          : items.map((item) => (
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
                  <div>
                    <StatusPill status={item.status} />
                  </div>
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
      </DenseTable>
    </div>
  );
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
    <WorkspaceLayout workspace="exchange">
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

          <RatesMobileCards items={data?.items ?? []} />
          <RatesTabletRows items={data?.items ?? []} />
          <RatesDesktopTable items={data?.items ?? []} />
        </section>
      </>
    </WorkspaceLayout>
  );
}
