import Link from 'next/link';

import {
  getLedgerAnomalies,
  getLedgerAnomaliesSummary,
  type LedgerAnomalyClass,
  type LedgerAnomalyListResponse,
} from '../../../../lib/admin-api.server';

const CLASS_ORDER: LedgerAnomalyClass[] = [`stalePendingEntries`, `inconsistentOutcomeChains`, `largeValueOutliers`];

function formatDate(value: string | null | undefined) {
  if (!value) {
    return `-`;
  }

  return new Date(value).toLocaleString();
}

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function defaultDateRange() {
  const dateTo = new Date();
  const dateFrom = new Date(dateTo.getTime() - 7 * 24 * 60 * 60 * 1000);
  return {
    dateFrom: toDateOnly(dateFrom),
    dateTo: toDateOnly(dateTo),
  };
}

function isLedgerAnomalyClass(value: string | undefined): value is LedgerAnomalyClass {
  return value === `stalePendingEntries` || value === `inconsistentOutcomeChains` || value === `largeValueOutliers`;
}

type LedgerAnomalyItem = LedgerAnomalyListResponse[`items`][number];

function AnomalyCards({ items }: { items: LedgerAnomalyItem[] }) {
  if (items.length === 0) {
    return (
      <div className="queueCards">
        <article className="queueCard">
          <div className="muted">No anomalies found for the selected class and time window.</div>
        </article>
      </div>
    );
  }

  return (
    <div className="queueCards">
      {items.map((item) => (
        <article className="queueCard" key={item.id}>
          <div className="pageHeader">
            <div>
              <Link href={`/ledger/${item.ledgerEntryId}`}>
                <strong>{item.type}</strong>
              </Link>
              <div className="muted mono">{item.ledgerEntryId}</div>
            </div>
            <div className="muted">
              {item.amount} {item.currencyCode}
            </div>
          </div>
          <div className="queueCardBody">
            <div>
              Consumer: <Link href={`/consumers/${item.consumerId}`}>{item.consumerId}</Link>
            </div>
            <div>Status: {item.entryStatus}</div>
            <div className="muted">Latest outcome: {item.outcomeStatus ?? `-`}</div>
            <div className="muted">Outcome at: {formatDate(item.outcomeAt)}</div>
            <div className="muted">Created: {formatDate(item.createdAt)}</div>
            <p className="muted">{item.signal.detail}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function AnomalyTable({ items }: { items: LedgerAnomalyItem[] }) {
  return (
    <div className="tableWrap">
      <table className="tableDense">
        <thead>
          <tr>
            <th>Ledger entry</th>
            <th>Consumer</th>
            <th>Status</th>
            <th>Amount</th>
            <th>Signal detail</th>
            <th>Timestamps</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <Link href={`/ledger/${item.ledgerEntryId}`}>
                  <strong>{item.type}</strong>
                </Link>
                <div className="muted mono">{item.ledgerEntryId}</div>
              </td>
              <td>
                <Link href={`/consumers/${item.consumerId}`}>{item.consumerId}</Link>
              </td>
              <td>
                <div>{item.entryStatus}</div>
                <div className="muted">Latest: {item.outcomeStatus ?? `-`}</div>
              </td>
              <td>
                {item.amount} {item.currencyCode}
              </td>
              <td>{item.signal.detail}</td>
              <td>
                <div className="muted">Outcome: {formatDate(item.outcomeAt)}</div>
                <div className="muted">Created: {formatDate(item.createdAt)}</div>
              </td>
            </tr>
          ))}
          {items.length === 0 ? (
            <tr>
              <td colSpan={6}>No anomalies found for the selected class and time window.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export default async function LedgerAnomaliesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    class?: string;
    dateFrom?: string;
    dateTo?: string;
    cursor?: string;
  }>;
}) {
  const params = await searchParams;
  const defaults = defaultDateRange();
  const className = isLedgerAnomalyClass(params?.class?.trim()) ? params?.class.trim() : `stalePendingEntries`;
  const dateFrom = params?.dateFrom?.trim() || defaults.dateFrom;
  const dateTo = params?.dateTo?.trim() || defaults.dateTo;
  const cursor = params?.cursor?.trim() || undefined;

  const [summary, list] = await Promise.all([
    getLedgerAnomaliesSummary(),
    getLedgerAnomalies({
      className,
      dateFrom,
      dateTo,
      cursor,
      limit: 50,
    }),
  ]);

  const activeClass = summary?.classes[className];

  function buildHref(next: {
    className?: LedgerAnomalyClass;
    dateFrom?: string;
    dateTo?: string;
    cursor?: string | null;
  }) {
    const query = new URLSearchParams();
    query.set(`class`, next.className ?? className);
    query.set(`dateFrom`, next.dateFrom ?? dateFrom);
    if (next.dateTo ?? dateTo) {
      query.set(`dateTo`, next.dateTo ?? dateTo);
    }
    if (next.cursor) {
      query.set(`cursor`, next.cursor);
    }

    return `/ledger/anomalies?${query.toString()}`;
  }

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>Ledger anomalies</h1>
          <p className="muted">
            MVP-3.1a read-only queue for stale pending entries, inconsistent outcome chains, and large value outliers.
          </p>
        </div>
        <p className="muted">Computed: {summary?.computedAt ? new Date(summary.computedAt).toLocaleString() : `-`}</p>
      </section>

      <section className="statsGrid">
        {CLASS_ORDER.map((key) => {
          const item = summary?.classes[key];
          return (
            <article key={key} className="panel">
              <div className="pageHeader">
                <div>
                  <h2>{item?.label ?? key}</h2>
                  <p className="muted">Phase: {item?.phaseStatus ?? `live-actionable`}</p>
                </div>
                <Link className="secondaryButton" href={buildHref({ className: key, cursor: null })}>
                  Open
                </Link>
              </div>
              <p className="muted">Availability: {item?.availability ?? `temporarily-unavailable`}</p>
              <p>{item?.count == null ? `-` : String(item.count)} items</p>
            </article>
          );
        })}
      </section>

      <section className="panel pageHeader">
        <form className="actionsRow" method="get">
          <input type="hidden" name="class" value={className} />
          <input name="dateFrom" type="date" defaultValue={dateFrom} aria-label="Date from" />
          <input name="dateTo" type="date" defaultValue={dateTo} aria-label="Date to" />
          <button className="secondaryButton" type="submit">
            Apply
          </button>
          <Link
            className="secondaryButton"
            href={buildHref({ className, dateFrom: defaults.dateFrom, dateTo: defaults.dateTo, cursor: null })}
          >
            Reset
          </Link>
        </form>
      </section>

      <section className="panel">
        <div className="pageHeader">
          <div>
            <h2>{activeClass?.label ?? `Ledger anomalies`}</h2>
            <p className="muted">
              {list ? `${list.items.length} rows in this window` : `Queue unavailable from the backend read contract.`}
            </p>
          </div>
          {list?.nextCursor ? (
            <Link className="secondaryButton" href={buildHref({ cursor: list.nextCursor })}>
              Next
            </Link>
          ) : null}
        </div>

        {list ? (
          <>
            <AnomalyCards items={list.items} />
            <AnomalyTable items={list.items} />
          </>
        ) : (
          <p className="muted">
            Ledger anomaly queue is temporarily unavailable. Use the overview or system surface for fallback navigation.
          </p>
        )}
      </section>
    </>
  );
}
