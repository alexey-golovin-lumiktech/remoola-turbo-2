import Link from 'next/link';

import { cn } from '@remoola/ui';

import { type LedgerDisputesResponse, type LedgerEntriesListResponse } from '../../../../lib/admin-api/types';
import { EMPTY_VALUE } from '../../../../lib/admin-format';

export type LedgerEntryItem = LedgerEntriesListResponse[`items`][number];
export type DisputeItem = LedgerDisputesResponse[`items`][number];

function renderMetadata(value: Record<string, unknown>) {
  if (Object.keys(value).length === 0) {
    return <p className="muted">No metadata.</p>;
  }

  return <pre className="mono">{JSON.stringify(value, null, 2)}</pre>;
}

export function isNegativeAmount(value: LedgerEntryItem[`amount`]): boolean {
  return String(value).trim().startsWith(EMPTY_VALUE);
}

export function renderLedgerAmount(entry: LedgerEntryItem) {
  return (
    <span className={cn(`font-semibold text-white/92`, isNegativeAmount(entry.amount) && `text-rose-200`)}>
      {entry.amount} {entry.currencyCode}
    </span>
  );
}

export function LedgerEntryLinks({ entry }: { entry: LedgerEntryItem }) {
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

export function LedgerEntryAssignedTo({ entry }: { entry: LedgerEntryItem }) {
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

export function DisputeLinks({ dispute }: { dispute: DisputeItem }) {
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

export function DisputeMetadataViewer({ dispute }: { dispute: DisputeItem }) {
  return (
    <details>
      <summary className="muted">Metadata viewer</summary>
      {renderMetadata(dispute.metadata)}
    </details>
  );
}
