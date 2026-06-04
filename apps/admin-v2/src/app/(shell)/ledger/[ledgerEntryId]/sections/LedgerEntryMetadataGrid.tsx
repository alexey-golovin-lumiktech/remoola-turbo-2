import { nestedPanelClass } from '../../../../../components/ui-classes';
import { EMPTY_VALUE, formatDate } from '../../../../../lib/admin-format';
import { renderObject } from '../ledger-entry-shared';
import { type LedgerEntryCasePageData } from '../page.loader';

export function LedgerEntryMetadataGrid({ ledgerCase }: { ledgerCase: LedgerEntryCasePageData[`ledgerCase`] }) {
  return (
    <section className="detailGrid">
      <article className="panel">
        <h2>Metadata</h2>
        {renderObject(ledgerCase.metadata)}
      </article>
      <article className="panel">
        <h2>Outcome timeline</h2>
        <div className="formStack">
          {ledgerCase.outcomes.length === 0 ? <p className="muted">No outcomes.</p> : null}
          {ledgerCase.outcomes.map((outcome) => (
            <div className={nestedPanelClass} key={outcome.id}>
              <strong>{outcome.status}</strong>
              <p className="muted">Source: {outcome.source ?? EMPTY_VALUE}</p>
              <p className="muted">External id: {outcome.externalId ?? EMPTY_VALUE}</p>
              <p className="muted">{formatDate(outcome.createdAt)}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
