import Link from 'next/link';

import { type ExchangeScheduledCasePageData } from '../page.loader';

export function ExchangeScheduledLedgerContextSection({
  conversion,
}: {
  conversion: ExchangeScheduledCasePageData[`conversion`];
}) {
  return (
    <article className="panel">
      <h2>Linked ledger context</h2>
      <div className="formStack">
        {conversion.linkedLedgerEntries.length === 0 ? (
          <p className="muted">No ledger entries are linked to this conversion.</p>
        ) : null}
        {conversion.linkedLedgerEntries.map((entry) => (
          <div className="panel" key={entry.id}>
            <strong>{entry.type}</strong>
            <p className="muted">
              {entry.amount} {entry.currencyCode}
            </p>
            <p className="muted">Effective status: {entry.effectiveStatus}</p>
            <p className="muted">Ledger id: {entry.ledgerId}</p>
            <div className="actionsRow">
              <Link className="secondaryButton" href={`/ledger/${entry.id}`}>
                Open ledger entry
              </Link>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
