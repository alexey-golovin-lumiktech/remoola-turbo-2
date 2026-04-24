import Link from 'next/link';

import { DenseTable } from '../../../components/dense-table';
import { MobileQueueCard } from '../../../components/mobile-queue-card';
import { TabletRow } from '../../../components/tablet-row';
import { WorkspaceLayout } from '../../../components/workspace-layout';
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
      <div className="readSurface md:hidden" data-view="mobile">
        <div className="panel muted">No ledger entries found for the current filters.</div>
      </div>
    );
  }

  return (
    <div className="readSurface md:hidden" data-view="mobile">
      <div className="queueCards">
        {items.map((entry) => (
          <MobileQueueCard
            key={entry.id}
            id={entry.id}
            href={`/ledger/${entry.id}`}
            title={entry.type}
            subtitle={<span className="mono">{entry.id}</span>}
            trailing={
              <>
                {entry.amount} {entry.currencyCode}
              </>
            }
          >
            <div className="muted">{entry.paymentRail ?? `No rail`}</div>
            <LedgerEntryLinks entry={entry} />
            <div>{entry.effectiveStatus}</div>
            <div className="muted">Persisted: {entry.persistedStatus}</div>
            <div className="muted">Disputes: {entry.disputeCount}</div>
            <div className="muted">Created: {formatDate(entry.createdAt)}</div>
            <div className="muted">
              Assigned to: <LedgerEntryAssignedTo entry={entry} />
            </div>
          </MobileQueueCard>
        ))}
      </div>
    </div>
  );
}

function LedgerEntriesTabletRows({ items }: { items: LedgerEntryItem[] }) {
  if (items.length === 0) {
    return (
      <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
        <div className="panel muted">No ledger entries found for the current filters.</div>
      </div>
    );
  }

  return (
    <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
      <div className="condensedList">
        {items.map((entry) => (
          <TabletRow
            key={entry.id}
            primary={
              <>
                <Link href={`/ledger/${entry.id}`}>
                  <strong>{entry.type}</strong>
                </Link>
                <div className="muted mono">{entry.id}</div>
              </>
            }
            cells={[
              <LedgerEntryLinks entry={entry} key="links" />,
              <div key="status">
                <div>{entry.effectiveStatus}</div>
                <div className="muted">Persisted: {entry.persistedStatus}</div>
              </div>,
              <div key="amount">
                <div>
                  {entry.amount} {entry.currencyCode}
                </div>
                <div className="muted">{entry.paymentRail ?? `No rail`}</div>
              </div>,
              <div key="disputes-assigned">
                <div className="muted">Disputes: {entry.disputeCount}</div>
                <div className="muted">Created: {formatDate(entry.createdAt)}</div>
                <div className="muted">
                  Assigned: <LedgerEntryAssignedTo entry={entry} />
                </div>
              </div>,
            ]}
          />
        ))}
      </div>
    </div>
  );
}

function LedgerEntriesDesktopTable({ items }: { items: LedgerEntryItem[] }) {
  return (
    <div className="readSurface hidden xl:block" data-view="desktop">
      <DenseTable
        headers={[`Ledger entry`, `Links`, `Status`, `Assigned to`, `Amount`, `Disputes`, `Created`]}
        emptyMessage="No ledger entries found for the current filters."
      >
        {items.length === 0
          ? null
          : items.map((entry) => (
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
      </DenseTable>
    </div>
  );
}

function DisputesMobileCards({ items }: { items: DisputeItem[] }) {
  if (items.length === 0) {
    return (
      <div className="readSurface md:hidden" data-view="mobile">
        <div className="panel muted">No dispute records found for the current filters.</div>
      </div>
    );
  }

  return (
    <div className="readSurface md:hidden" data-view="mobile">
      <div className="queueCards">
        {items.map((dispute) => (
          <MobileQueueCard
            key={dispute.id}
            id={dispute.id}
            title={dispute.stripeDisputeId}
            subtitle={<span className="mono">{dispute.id}</span>}
            trailing={dispute.disputeStatus ?? `-`}
          >
            <div>
              <Link href={`/ledger/${dispute.ledgerEntry.id}`}>{dispute.ledgerEntry.type}</Link>
            </div>
            <div className="muted mono">{dispute.ledgerEntry.id}</div>
            <DisputeLinks dispute={dispute} />
            <div className="muted">Reason: {dispute.reason ?? `-`}</div>
            <div className="muted">Captured: {formatDate(dispute.createdAt)}</div>
            <DisputeMetadataViewer dispute={dispute} />
          </MobileQueueCard>
        ))}
      </div>
    </div>
  );
}

function DisputesTabletRows({ items }: { items: DisputeItem[] }) {
  if (items.length === 0) {
    return (
      <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
        <div className="panel muted">No dispute records found for the current filters.</div>
      </div>
    );
  }

  return (
    <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
      <div className="condensedList">
        {items.map((dispute) => (
          <TabletRow
            key={dispute.id}
            primary={
              <>
                <strong>{dispute.stripeDisputeId}</strong>
                <div className="muted mono">{dispute.id}</div>
              </>
            }
            cells={[
              <div key="ledger">
                <Link href={`/ledger/${dispute.ledgerEntry.id}`}>{dispute.ledgerEntry.type}</Link>
                <div className="muted mono">{dispute.ledgerEntry.id}</div>
              </div>,
              <DisputeLinks dispute={dispute} key="links" />,
              <div key="status">
                <div>{dispute.disputeStatus ?? `-`}</div>
                <div className="muted">Reason: {dispute.reason ?? `-`}</div>
              </div>,
              <div key="captured">
                <div className="muted">Captured: {formatDate(dispute.createdAt)}</div>
                <DisputeMetadataViewer dispute={dispute} />
              </div>,
            ]}
          />
        ))}
      </div>
    </div>
  );
}

function DisputesDesktopTable({ items }: { items: DisputeItem[] }) {
  return (
    <div className="readSurface hidden xl:block" data-view="desktop">
      <DenseTable
        headers={[`Dispute`, `Ledger link`, `Payment / consumer`, `Status`, `Reason`, `Captured`]}
        emptyMessage="No dispute records found for the current filters."
      >
        {items.length === 0
          ? null
          : items.map((dispute) => (
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
      </DenseTable>
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
    <WorkspaceLayout workspace="ledger">
      <>
        <section className="panel pageHeader">
          <div>
            <h1>Ledger and Disputes</h1>
            <p className="muted">Read-only workspace for exact ledger outcomes and dispute review.</p>
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
            {view === `entries` ? (
              <input name="currencyCode" defaultValue={currencyCode} placeholder="currency" />
            ) : null}
            {view === `entries` ? (
              <input name="amountSign" defaultValue={amountSign} placeholder="amount sign" />
            ) : null}
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
    </WorkspaceLayout>
  );
}
