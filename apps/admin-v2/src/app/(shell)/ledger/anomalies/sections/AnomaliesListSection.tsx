import Link from 'next/link';

import { ActionGhost } from '../../../../../components/action-ghost';
import { DenseTable } from '../../../../../components/dense-table';
import { Panel } from '../../../../../components/panel';
import {
  type LedgerAnomalyClass,
  type LedgerAnomalyListResponse,
  type LedgerAnomalySummaryResponse,
} from '../../../../../lib/admin-api/types';
import { EMPTY_VALUE, formatDate } from '../../../../../lib/admin-format';
import { type BuildHrefFn, type LedgerAnomalyItem } from '../anomalies-shared';

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
            <div className="muted">Latest outcome: {item.outcomeStatus ?? EMPTY_VALUE}</div>
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
    <DenseTable
      headers={[`Ledger entry`, `Consumer`, `Status`, `Amount`, `Signal detail`, `Timestamps`]}
      emptyMessage="No anomalies found for the selected class and time window."
    >
      {items.map((item) => (
        <tr key={item.id}>
          <td className="px-3 py-3">
            <Link href={`/ledger/${item.ledgerEntryId}`}>
              <strong>{item.type}</strong>
            </Link>
            <div className="muted mono">{item.ledgerEntryId}</div>
          </td>
          <td className="px-3 py-3">
            <Link href={`/consumers/${item.consumerId}`}>{item.consumerId}</Link>
          </td>
          <td className="px-3 py-3">
            <div>{item.entryStatus}</div>
            <div className="muted">Latest: {item.outcomeStatus ?? EMPTY_VALUE}</div>
          </td>
          <td className="px-3 py-3">
            {item.amount} {item.currencyCode}
          </td>
          <td className="px-3 py-3">{item.signal.detail}</td>
          <td className="px-3 py-3">
            <div className="muted">Outcome: {formatDate(item.outcomeAt)}</div>
            <div className="muted">Created: {formatDate(item.createdAt)}</div>
          </td>
        </tr>
      ))}
    </DenseTable>
  );
}

export function AnomaliesListSection({
  className,
  list,
  summary,
  buildHref,
}: {
  className: LedgerAnomalyClass;
  list: LedgerAnomalyListResponse | null;
  summary: LedgerAnomalySummaryResponse | null;
  buildHref: BuildHrefFn;
}) {
  const activeClass = summary?.classes[className];
  return (
    <Panel
      title={activeClass?.label ?? `Ledger anomalies`}
      description={
        list ? `${list.items.length} rows in this window` : `Queue unavailable from the backend read contract.`
      }
      actions={list?.nextCursor ? <ActionGhost href={buildHref({ cursor: list.nextCursor })}>Next</ActionGhost> : null}
    >
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
      {activeClass?.availability === `temporarily-unavailable` && list?.items.length === 0 ? (
        <p className="muted">
          This anomaly class is temporarily unavailable right now. Retry later or use overview/system for fallback
          triage.
        </p>
      ) : null}
    </Panel>
  );
}
