import Link from 'next/link';

import { nestedPanelClass } from '../../../../../components/ui-classes';
import { formatDate } from '../../../../../lib/admin-format';
import { renderObject } from '../ledger-entry-shared';
import { type LedgerEntryCasePageData } from '../page.loader';

export function LedgerEntryDisputesGrid({ ledgerCase }: { ledgerCase: LedgerEntryCasePageData[`ledgerCase`] }) {
  return (
    <section className="detailGrid">
      <article className="panel">
        <h2>Dispute records</h2>
        <div className="formStack">
          {ledgerCase.disputes.length === 0 ? <p className="muted">No disputes.</p> : null}
          {ledgerCase.disputes.map((dispute) => (
            <div className={nestedPanelClass} key={dispute.id}>
              <strong>{dispute.stripeDisputeId}</strong>
              <p className="muted">{formatDate(dispute.createdAt)}</p>
              {renderObject(dispute.metadata)}
            </div>
          ))}
        </div>
      </article>
      <article className="panel">
        <h2>Related ledger chain</h2>
        <div className="formStack">
          {ledgerCase.relatedEntries.map((entry) => (
            <div className={nestedPanelClass} key={entry.id}>
              <strong>{entry.type}</strong>
              <p className="muted">
                {entry.amount} {entry.currencyCode}
              </p>
              <p className="muted">Effective status: {entry.effectiveStatus}</p>
              <div className="actionsRow">
                <Link className="secondaryButton" href={`/ledger/${entry.id}`}>
                  Open entry
                </Link>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
