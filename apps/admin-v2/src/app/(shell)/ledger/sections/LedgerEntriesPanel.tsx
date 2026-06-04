import Link from 'next/link';

import {
  isNegativeAmount,
  LedgerEntryAssignedTo,
  LedgerEntryLinks,
  type LedgerEntryItem,
  renderLedgerAmount,
} from './ledger-shared';
import { ActionGhost } from '../../../../components/action-ghost';
import { DenseTable } from '../../../../components/dense-table';
import { MobileQueueCard } from '../../../../components/mobile-queue-card';
import { Panel } from '../../../../components/panel';
import { TabletRow } from '../../../../components/tablet-row';
import { TinyPill } from '../../../../components/tiny-pill';
import { type LedgerEntriesListResponse } from '../../../../lib/admin-api/types';
import { formatDate } from '../../../../lib/admin-format';

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

export function LedgerEntriesPanel({
  entries,
  buildHref,
}: {
  entries: LedgerEntriesListResponse | null;
  buildHref: (next: { cursor?: string; view?: string }) => string;
}) {
  const items = entries?.items ?? [];
  return (
    <Panel
      title="Ledger entries"
      description={`${items.length} rows in this window`}
      actions={
        entries?.pageInfo.nextCursor ? (
          <ActionGhost href={buildHref({ cursor: entries.pageInfo.nextCursor })}>Next</ActionGhost>
        ) : null
      }
    >
      <LedgerEntriesMobileCards items={items} />
      <LedgerEntriesTabletRows items={items} />
      <LedgerEntriesDesktopTable items={items} />
    </Panel>
  );
}
