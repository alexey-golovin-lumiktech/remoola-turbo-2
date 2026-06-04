import Link from 'next/link';

import { type DisputeItem, DisputeLinks, DisputeMetadataViewer } from './ledger-shared';
import { ActionGhost } from '../../../../components/action-ghost';
import { DenseTable } from '../../../../components/dense-table';
import { MobileQueueCard } from '../../../../components/mobile-queue-card';
import { Panel } from '../../../../components/panel';
import { TabletRow } from '../../../../components/tablet-row';
import { type LedgerDisputesResponse } from '../../../../lib/admin-api/types';
import { EMPTY_VALUE, formatDate } from '../../../../lib/admin-format';

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
            trailing={dispute.disputeStatus ?? EMPTY_VALUE}
          >
            <div>
              <Link href={`/ledger/${dispute.ledgerEntry.id}`}>{dispute.ledgerEntry.type}</Link>
            </div>
            <div className="muted mono">{dispute.ledgerEntry.id}</div>
            <DisputeLinks dispute={dispute} />
            <div className="muted">Reason: {dispute.reason ?? EMPTY_VALUE}</div>
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
                <div>{dispute.disputeStatus ?? EMPTY_VALUE}</div>
                <div className="muted">Reason: {dispute.reason ?? EMPTY_VALUE}</div>
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
                <td>{dispute.disputeStatus ?? EMPTY_VALUE}</td>
                <td>{dispute.reason ?? EMPTY_VALUE}</td>
                <td>{formatDate(dispute.createdAt)}</td>
              </tr>
            ))}
      </DenseTable>
    </div>
  );
}

export function LedgerDisputesPanel({
  disputes,
  buildHref,
}: {
  disputes: LedgerDisputesResponse | null;
  buildHref: (next: { cursor?: string; view?: string }) => string;
}) {
  const items = disputes?.items ?? [];
  return (
    <Panel
      title="Dispute log"
      description="Append-only dispute records captured from Stripe webhooks."
      actions={
        disputes?.pageInfo.nextCursor ? (
          <ActionGhost href={buildHref({ view: `disputes`, cursor: disputes.pageInfo.nextCursor })}>Next</ActionGhost>
        ) : null
      }
    >
      <DisputesMobileCards items={items} />
      <DisputesTabletRows items={items} />
      <DisputesDesktopTable items={items} />
    </Panel>
  );
}
