import Link from 'next/link';

import { cn } from '@remoola/ui';

import { ActionGhost } from '../../../components/action-ghost';
import { DenseTable } from '../../../components/dense-table';
import { MobileQueueCard } from '../../../components/mobile-queue-card';
import { Panel } from '../../../components/panel';
import { TabletRow } from '../../../components/tablet-row';
import { TinyPill } from '../../../components/tiny-pill';
import { buttonRowClass, fieldClass, fieldLabelClass, textInputClass } from '../../../components/ui-classes';
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

function isNegativeAmount(value: LedgerEntryItem[`amount`]): boolean {
  return String(value).trim().startsWith(`-`);
}

function renderLedgerAmount(entry: LedgerEntryItem) {
  return (
    <span className={cn(`font-semibold text-white/92`, isNegativeAmount(entry.amount) && `text-rose-200`)}>
      {entry.amount} {entry.currencyCode}
    </span>
  );
}

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
              <div key="status">
                <div>{renderLedgerAmount(entry)}</div>
                <div className="muted">{entry.effectiveStatus}</div>
                {entry.persistedStatus !== entry.effectiveStatus ? (
                  <div className="muted">Persisted: {entry.persistedStatus}</div>
                ) : null}
              </div>,
              <LedgerEntryLinks entry={entry} key="links" />,
              <div key="entry-meta">
                <div>{entry.type}</div>
                <div className="muted">{entry.paymentRail ?? `No rail`}</div>
              </div>,
              <div key="disputes-assigned">
                <div className="muted">Disputes: {entry.disputeCount}</div>
                <div className="muted">Created: {formatDate(entry.createdAt)}</div>
                {entry.assignedTo ? (
                  <div className="muted">
                    Assigned: <LedgerEntryAssignedTo entry={entry} />
                  </div>
                ) : null}
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
        headers={[`Entry`, `Amount / status`, `Links`, `Follow-up`, `Created`]}
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
                  <div>{renderLedgerAmount(entry)}</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <TinyPill>{entry.effectiveStatus}</TinyPill>
                    {entry.persistedStatus !== entry.effectiveStatus ? (
                      <TinyPill>{entry.persistedStatus}</TinyPill>
                    ) : null}
                  </div>
                </td>
                <td>
                  <LedgerEntryLinks entry={entry} />
                </td>
                <td>
                  <div className="muted">Disputes: {entry.disputeCount}</div>
                  {entry.assignedTo ? (
                    <div className="muted">
                      Assigned: <LedgerEntryAssignedTo entry={entry} />
                    </div>
                  ) : (
                    <div className="muted">Unassigned</div>
                  )}
                </td>
                <td>
                  <div>{formatDate(entry.createdAt)}</div>
                  {isNegativeAmount(entry.amount) ? <div className="muted">Negative amount</div> : null}
                </td>
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
        <Panel
          title="Ledger and Disputes"
          description="Read-only workspace for exact ledger outcomes and dispute review."
          actions={
            <div className={buttonRowClass}>
              <ActionGhost href={buildHref({ view: `entries` })}>Ledger entries</ActionGhost>
              <ActionGhost href={buildHref({ view: `disputes` })}>Disputes</ActionGhost>
            </div>
          }
        />

        <Panel
          title="Queue filters"
          description="Use the exact identifiers and status slices needed for ledger or dispute investigation."
        >
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" method="get">
            {view === `disputes` ? <input type="hidden" name="view" value="disputes" /> : null}
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Search</span>
              <input
                className={textInputClass}
                name="q"
                defaultValue={q}
                placeholder="Search by ids, Stripe ids or idempotency key"
              />
            </label>
            {view === `entries` ? (
              <label className={fieldClass}>
                <span className={fieldLabelClass}>Entry type</span>
                <input className={textInputClass} name="type" defaultValue={type} placeholder="type" />
              </label>
            ) : null}
            {view === `entries` ? (
              <label className={fieldClass}>
                <span className={fieldLabelClass}>Effective status</span>
                <input className={textInputClass} name="status" defaultValue={status} placeholder="effective status" />
              </label>
            ) : null}
            {view === `entries` ? (
              <label className={fieldClass}>
                <span className={fieldLabelClass}>Currency</span>
                <input
                  className={textInputClass}
                  name="currencyCode"
                  defaultValue={currencyCode}
                  placeholder="currency"
                />
              </label>
            ) : null}
            {view === `entries` ? (
              <label className={fieldClass}>
                <span className={fieldLabelClass}>Amount sign</span>
                <input
                  className={textInputClass}
                  name="amountSign"
                  defaultValue={amountSign}
                  placeholder="amount sign"
                />
              </label>
            ) : null}
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Payment request</span>
              <input
                className={textInputClass}
                name="paymentRequestId"
                defaultValue={paymentRequestId}
                placeholder="payment request id"
              />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Consumer</span>
              <input className={textInputClass} name="consumerId" defaultValue={consumerId} placeholder="consumer id" />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Date from</span>
              <input className={textInputClass} name="dateFrom" type="date" defaultValue={dateFrom} />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Date to</span>
              <input className={textInputClass} name="dateTo" type="date" defaultValue={dateTo} />
            </label>
            <div className="flex items-end gap-2 xl:col-span-2">
              <ActionGhost type="submit">Apply</ActionGhost>
              <ActionGhost href={view === `disputes` ? `/ledger?view=disputes` : `/ledger`}>Reset</ActionGhost>
            </div>
          </form>
        </Panel>

        {view === `entries` ? (
          <Panel
            title="Ledger entries"
            description={`${entryItems.length} rows in this window`}
            actions={
              entries?.pageInfo.nextCursor ? (
                <ActionGhost href={buildHref({ cursor: entries.pageInfo.nextCursor })}>Next</ActionGhost>
              ) : null
            }
          >
            <LedgerEntriesMobileCards items={entryItems} />
            <LedgerEntriesTabletRows items={entryItems} />
            <LedgerEntriesDesktopTable items={entryItems} />
          </Panel>
        ) : (
          <Panel
            title="Dispute log"
            description="Append-only dispute records captured from Stripe webhooks."
            actions={
              disputes?.pageInfo.nextCursor ? (
                <ActionGhost href={buildHref({ view: `disputes`, cursor: disputes.pageInfo.nextCursor })}>
                  Next
                </ActionGhost>
              ) : null
            }
          >
            <DisputesMobileCards items={disputeItems} />
            <DisputesTabletRows items={disputeItems} />
            <DisputesDesktopTable items={disputeItems} />
          </Panel>
        )}
      </>
    </WorkspaceLayout>
  );
}
