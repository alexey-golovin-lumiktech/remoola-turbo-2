import Link from 'next/link';

import {
  getLedgerDisputes,
  getLedgerEntries,
  type LedgerDisputesResponse,
  type LedgerEntriesListResponse,
} from '../../../lib/admin-api.server';

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

function renderMetadata(value: Record<string, unknown>) {
  if (Object.keys(value).length === 0) {
    return <p className="muted">No metadata.</p>;
  }

  return <pre className="mono">{JSON.stringify(value, null, 2)}</pre>;
}

type LedgerEntryItem = LedgerEntriesListResponse[`items`][number];
type DisputeItem = LedgerDisputesResponse[`items`][number];

function LedgerEntryLinks({ entry }: { entry: LedgerEntryItem }) {
  return (
    <>
      <div>
        Consumer: <Link href={`/consumers/${entry.consumerId}`}>{entry.consumerEmail ?? entry.consumerId}</Link>
      </div>
      {entry.paymentRequestId ? (
        <div>
          Payment: <Link href={`/payments/${entry.paymentRequestId}`}>{entry.paymentRequestId}</Link>
        </div>
      ) : (
        <div className="muted">No payment request</div>
      )}
    </>
  );
}

function LedgerEntryAssignedTo({ entry }: { entry: LedgerEntryItem }) {
  if (!entry.assignedTo) {
    return <span className="muted">—</span>;
  }

  return (
    <>
      <span>{entry.assignedTo.name ?? entry.assignedTo.email ?? entry.assignedTo.id}</span>
      {entry.assignedTo.email ? <span className="muted"> {entry.assignedTo.email}</span> : null}
    </>
  );
}

function DisputeLinks({ dispute }: { dispute: DisputeItem }) {
  return (
    <>
      {dispute.ledgerEntry.paymentRequestId ? (
        <div>
          Payment:{` `}
          <Link href={`/payments/${dispute.ledgerEntry.paymentRequestId}`}>{dispute.ledgerEntry.paymentRequestId}</Link>
        </div>
      ) : null}
      <div>
        Consumer:{` `}
        <Link href={`/consumers/${dispute.ledgerEntry.consumerId}`}>{dispute.ledgerEntry.consumerId}</Link>
      </div>
    </>
  );
}

function DisputeMetadataViewer({ dispute }: { dispute: DisputeItem }) {
  return (
    <details>
      <summary className="muted">Metadata viewer</summary>
      {renderMetadata(dispute.metadata)}
    </details>
  );
}

function LedgerEntriesMobileCards({ items }: { items: LedgerEntryItem[] }) {
  if (items.length === 0) {
    return (
      <div className="readSurface" data-view="mobile">
        <div className="panel muted">No ledger entries found for the current filters.</div>
      </div>
    );
  }

  return (
    <div className="readSurface" data-view="mobile">
      <div className="queueCards">
        {items.map((entry) => (
          <article className="queueCard" key={entry.id}>
            <div className="pageHeader">
              <div>
                <Link href={`/ledger/${entry.id}`}>
                  <strong>{entry.type}</strong>
                </Link>
                <div className="muted mono">{entry.id}</div>
              </div>
              <div className="muted">
                {entry.amount} {entry.currencyCode}
              </div>
            </div>
            <div className="queueCardBody">
              <div className="muted">{entry.paymentRail ?? `No rail`}</div>
              <LedgerEntryLinks entry={entry} />
              <div>{entry.effectiveStatus}</div>
              <div className="muted">Persisted: {entry.persistedStatus}</div>
              <div className="muted">Disputes: {entry.disputeCount}</div>
              <div className="muted">Created: {formatDate(entry.createdAt)}</div>
              <div className="muted">
                Assigned to: <LedgerEntryAssignedTo entry={entry} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function LedgerEntriesTabletRows({ items }: { items: LedgerEntryItem[] }) {
  if (items.length === 0) {
    return (
      <div className="readSurface" data-view="tablet">
        <div className="panel muted">No ledger entries found for the current filters.</div>
      </div>
    );
  }

  return (
    <div className="readSurface" data-view="tablet">
      <div className="condensedList">
        {items.map((entry) => (
          <article className="condensedRow" key={entry.id}>
            <div className="condensedRowPrimary">
              <Link href={`/ledger/${entry.id}`}>
                <strong>{entry.type}</strong>
              </Link>
              <div className="muted mono">{entry.id}</div>
            </div>
            <div className="condensedRowMeta">
              <LedgerEntryLinks entry={entry} />
            </div>
            <div className="condensedRowMeta">
              <div>{entry.effectiveStatus}</div>
              <div className="muted">Persisted: {entry.persistedStatus}</div>
            </div>
            <div className="condensedRowMeta">
              <div>
                {entry.amount} {entry.currencyCode}
              </div>
              <div className="muted">{entry.paymentRail ?? `No rail`}</div>
            </div>
            <div className="condensedRowMeta">
              <div className="muted">Disputes: {entry.disputeCount}</div>
              <div className="muted">Created: {formatDate(entry.createdAt)}</div>
            </div>
            <div className="condensedRowMeta">
              <LedgerEntryAssignedTo entry={entry} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function LedgerEntriesDesktopTable({ items }: { items: LedgerEntryItem[] }) {
  return (
    <div className="readSurface" data-view="desktop">
      <div className="tableWrap">
        <table className="tableDense">
          <thead>
            <tr>
              <th>Ledger entry</th>
              <th>Links</th>
              <th>Status</th>
              <th>Assigned to</th>
              <th>Amount</th>
              <th>Disputes</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry) => (
              <tr key={entry.id}>
                <td>
                  <Link href={`/ledger/${entry.id}`}>
                    <strong>{entry.type}</strong>
                  </Link>
                  <div className="muted mono">{entry.id}</div>
                  <div className="muted">{entry.paymentRail ?? `No rail`}</div>
                </td>
                <td>
                  <LedgerEntryLinks entry={entry} />
                </td>
                <td>
                  <div>{entry.effectiveStatus}</div>
                  <div className="muted">Persisted: {entry.persistedStatus}</div>
                </td>
                <td>
                  <LedgerEntryAssignedTo entry={entry} />
                </td>
                <td>
                  {entry.amount} {entry.currencyCode}
                </td>
                <td>{entry.disputeCount}</td>
                <td>{formatDate(entry.createdAt)}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={7}>No ledger entries found for the current filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DisputesMobileCards({ items }: { items: DisputeItem[] }) {
  if (items.length === 0) {
    return (
      <div className="readSurface" data-view="mobile">
        <div className="panel muted">No dispute records found for the current filters.</div>
      </div>
    );
  }

  return (
    <div className="readSurface" data-view="mobile">
      <div className="queueCards">
        {items.map((dispute) => (
          <article className="queueCard" key={dispute.id}>
            <div className="pageHeader">
              <div>
                <strong>{dispute.stripeDisputeId}</strong>
                <div className="muted mono">{dispute.id}</div>
              </div>
              <div className="muted">{dispute.disputeStatus ?? `-`}</div>
            </div>
            <div className="queueCardBody">
              <div>
                <Link href={`/ledger/${dispute.ledgerEntry.id}`}>{dispute.ledgerEntry.type}</Link>
              </div>
              <div className="muted mono">{dispute.ledgerEntry.id}</div>
              <DisputeLinks dispute={dispute} />
              <div className="muted">Reason: {dispute.reason ?? `-`}</div>
              <div className="muted">Captured: {formatDate(dispute.createdAt)}</div>
              <DisputeMetadataViewer dispute={dispute} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function DisputesTabletRows({ items }: { items: DisputeItem[] }) {
  if (items.length === 0) {
    return (
      <div className="readSurface" data-view="tablet">
        <div className="panel muted">No dispute records found for the current filters.</div>
      </div>
    );
  }

  return (
    <div className="readSurface" data-view="tablet">
      <div className="condensedList">
        {items.map((dispute) => (
          <article className="condensedRow" key={dispute.id}>
            <div className="condensedRowPrimary">
              <strong>{dispute.stripeDisputeId}</strong>
              <div className="muted mono">{dispute.id}</div>
            </div>
            <div className="condensedRowMeta">
              <Link href={`/ledger/${dispute.ledgerEntry.id}`}>{dispute.ledgerEntry.type}</Link>
              <div className="muted mono">{dispute.ledgerEntry.id}</div>
            </div>
            <div className="condensedRowMeta">
              <DisputeLinks dispute={dispute} />
            </div>
            <div className="condensedRowMeta">
              <div>{dispute.disputeStatus ?? `-`}</div>
              <div className="muted">Reason: {dispute.reason ?? `-`}</div>
            </div>
            <div className="condensedRowMeta">
              <div className="muted">Captured: {formatDate(dispute.createdAt)}</div>
              <DisputeMetadataViewer dispute={dispute} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function DisputesDesktopTable({ items }: { items: DisputeItem[] }) {
  return (
    <div className="readSurface" data-view="desktop">
      <div className="tableWrap">
        <table className="tableDense">
          <thead>
            <tr>
              <th>Dispute</th>
              <th>Ledger link</th>
              <th>Payment / consumer</th>
              <th>Status</th>
              <th>Reason</th>
              <th>Captured</th>
            </tr>
          </thead>
          <tbody>
            {items.map((dispute) => (
              <tr key={dispute.id}>
                <td>
                  <strong>{dispute.stripeDisputeId}</strong>
                  <div className="muted mono">{dispute.id}</div>
                  <DisputeMetadataViewer dispute={dispute} />
                </td>
                <td>
                  <Link href={`/ledger/${dispute.ledgerEntry.id}`}>{dispute.ledgerEntry.type}</Link>
                  <div className="muted mono">{dispute.ledgerEntry.id}</div>
                </td>
                <td>
                  <DisputeLinks dispute={dispute} />
                </td>
                <td>{dispute.disputeStatus ?? `-`}</td>
                <td>{dispute.reason ?? `-`}</td>
                <td>{formatDate(dispute.createdAt)}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={6}>No dispute records found for the current filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function LedgerPage({
  searchParams,
}: {
  searchParams?: Promise<{
    view?: string;
    cursor?: string;
    q?: string;
    type?: string;
    status?: string;
    currencyCode?: string;
    paymentRequestId?: string;
    consumerId?: string;
    amountSign?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  const params = await searchParams;
  const view = params?.view === `disputes` ? `disputes` : `entries`;
  const cursor = params?.cursor?.trim() ?? ``;
  const q = params?.q?.trim() ?? ``;
  const type = params?.type?.trim() ?? ``;
  const status = params?.status?.trim() ?? ``;
  const currencyCode = params?.currencyCode?.trim() ?? ``;
  const paymentRequestId = params?.paymentRequestId?.trim() ?? ``;
  const consumerId = params?.consumerId?.trim() ?? ``;
  const amountSign = params?.amountSign?.trim() ?? ``;
  const dateFrom = params?.dateFrom?.trim() ?? ``;
  const dateTo = params?.dateTo?.trim() ?? ``;

  const [entries, disputes] = await Promise.all([
    view === `entries`
      ? getLedgerEntries({
          cursor: cursor || undefined,
          q,
          type,
          status,
          currencyCode,
          paymentRequestId,
          consumerId,
          amountSign,
          dateFrom,
          dateTo,
        })
      : Promise.resolve(null),
    view === `disputes`
      ? getLedgerDisputes({
          cursor: cursor || undefined,
          q,
          paymentRequestId,
          consumerId,
          dateFrom,
          dateTo,
        })
      : Promise.resolve(null),
  ]);
  const entryItems = entries?.items ?? [];
  const disputeItems = disputes?.items ?? [];

  function buildHref(next: { cursor?: string; view?: string }) {
    const query = new URLSearchParams();
    if ((next.view ?? view) === `disputes`) query.set(`view`, `disputes`);
    if (q) query.set(`q`, q);
    if (type && (next.view ?? view) === `entries`) query.set(`type`, type);
    if (status && (next.view ?? view) === `entries`) query.set(`status`, status);
    if (currencyCode && (next.view ?? view) === `entries`) query.set(`currencyCode`, currencyCode);
    if (amountSign && (next.view ?? view) === `entries`) query.set(`amountSign`, amountSign);
    if (paymentRequestId) query.set(`paymentRequestId`, paymentRequestId);
    if (consumerId) query.set(`consumerId`, consumerId);
    if (dateFrom) query.set(`dateFrom`, dateFrom);
    if (dateTo) query.set(`dateTo`, dateTo);
    if (next.cursor) query.set(`cursor`, next.cursor);
    return `/ledger?${query.toString()}`;
  }

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>Ledger and Disputes</h1>
          <p className="muted">MVP-1c read surfaces for exact ledger outcomes and append-only dispute drilldown.</p>
        </div>
        <div className="actionsRow">
          <Link className="secondaryButton" href={buildHref({ view: `entries` })}>
            Ledger entries
          </Link>
          <Link className="secondaryButton" href={buildHref({ view: `disputes` })}>
            Disputes
          </Link>
        </div>
      </section>

      <section className="panel pageHeader">
        <form className="actionsRow" method="get">
          {view === `disputes` ? <input type="hidden" name="view" value="disputes" /> : null}
          <input name="q" defaultValue={q} placeholder="Search by ids, Stripe ids or idempotency key" />
          {view === `entries` ? <input name="type" defaultValue={type} placeholder="type" /> : null}
          {view === `entries` ? <input name="status" defaultValue={status} placeholder="effective status" /> : null}
          {view === `entries` ? <input name="currencyCode" defaultValue={currencyCode} placeholder="currency" /> : null}
          {view === `entries` ? <input name="amountSign" defaultValue={amountSign} placeholder="amount sign" /> : null}
          <input name="paymentRequestId" defaultValue={paymentRequestId} placeholder="payment request id" />
          <input name="consumerId" defaultValue={consumerId} placeholder="consumer id" />
          <input name="dateFrom" type="date" defaultValue={dateFrom} aria-label="Date from" />
          <input name="dateTo" type="date" defaultValue={dateTo} aria-label="Date to" />
          <button className="secondaryButton" type="submit">
            Apply
          </button>
          <Link className="secondaryButton" href={view === `disputes` ? `/ledger?view=disputes` : `/ledger`}>
            Reset
          </Link>
        </form>
      </section>

      {view === `entries` ? (
        <section className="panel">
          <div className="pageHeader">
            <div>
              <h2>Ledger entries</h2>
              <p className="muted">{entryItems.length} rows in this window</p>
            </div>
            {entries?.pageInfo.nextCursor ? (
              <Link className="secondaryButton" href={buildHref({ cursor: entries.pageInfo.nextCursor })}>
                Next
              </Link>
            ) : null}
          </div>
          <LedgerEntriesMobileCards items={entryItems} />
          <LedgerEntriesTabletRows items={entryItems} />
          <LedgerEntriesDesktopTable items={entryItems} />
        </section>
      ) : (
        <section className="panel">
          <div className="pageHeader">
            <div>
              <h2>Dispute log</h2>
              <p className="muted">Append-only dispute records captured from Stripe webhooks.</p>
            </div>
            {disputes?.pageInfo.nextCursor ? (
              <Link
                className="secondaryButton"
                href={buildHref({ view: `disputes`, cursor: disputes.pageInfo.nextCursor })}
              >
                Next
              </Link>
            ) : null}
          </div>
          <DisputesMobileCards items={disputeItems} />
          <DisputesTabletRows items={disputeItems} />
          <DisputesDesktopTable items={disputeItems} />
        </section>
      )}
    </>
  );
}
