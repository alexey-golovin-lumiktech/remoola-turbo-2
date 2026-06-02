import { formatDate } from '../ledger-entry-shared';
import { type LedgerEntryCasePageData } from '../page.loader';

export function LedgerEntrySummaryGrid({ ledgerCase }: { ledgerCase: LedgerEntryCasePageData[`ledgerCase`] }) {
  return (
    <section className="statsGrid">
      <article className="panel">
        <h3>Core</h3>
        <p className="muted">Ledger id: {ledgerCase.core.ledgerId}</p>
        <p className="muted">
          Amount: {ledgerCase.core.amount} {ledgerCase.core.currencyCode}
        </p>
        <p className="muted">Persisted: {ledgerCase.core.persistedStatus}</p>
        <p className="muted">Effective: {ledgerCase.core.effectiveStatus}</p>
        <p className="muted">Current case status follows the latest recorded outcome.</p>
      </article>
      <article className="panel">
        <h3>Links</h3>
        <p className="muted">Consumer: {ledgerCase.consumer.email ?? ledgerCase.consumer.id}</p>
        <p className="muted">Payment request: {ledgerCase.paymentRequest?.id ?? `-`}</p>
        <p className="muted">Stripe id: {ledgerCase.core.stripeId ?? `-`}</p>
        <p className="muted">Idempotency key: {ledgerCase.core.idempotencyKey ?? `-`}</p>
      </article>
      <article className="panel">
        <h3>Fees and freshness</h3>
        <p className="muted">Fees type: {ledgerCase.core.feesType ?? `-`}</p>
        <p className="muted">Fees amount: {ledgerCase.core.feesAmount ?? `-`}</p>
        <p className="muted">Data freshness: {ledgerCase.dataFreshnessClass}</p>
        <p className="muted">Updated: {formatDate(ledgerCase.core.updatedAt)}</p>
      </article>
    </section>
  );
}
