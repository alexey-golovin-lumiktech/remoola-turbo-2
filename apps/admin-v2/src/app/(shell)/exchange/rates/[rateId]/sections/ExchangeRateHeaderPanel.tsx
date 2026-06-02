import Link from 'next/link';

import { type ExchangeRateCasePageData } from '../page.loader';

export function ExchangeRateHeaderPanel({ rate }: { rate: ExchangeRateCasePageData[`rate`] }) {
  return (
    <section className="panel pageHeader">
      <div>
        <h1>Exchange rate</h1>
        <p className="muted">
          {rate.core.sourceCurrency}/{rate.core.targetCurrency} · {rate.core.status}
        </p>
        <p className="muted mono">{rate.id}</p>
        <div className="pillRow">
          <span className="pill">{rate.core.status}</span>
          {rate.stalenessIndicator.isStale ? <span className="pill">Stale</span> : <span className="pill">Fresh</span>}
          {rate.actionControls.canApprove ? <span className="pill">Approval pending</span> : null}
        </div>
      </div>
      <div className="actionsRow">
        <Link className="secondaryButton" href="/exchange/rates">
          Back to rates
        </Link>
        <Link
          className="secondaryButton"
          href={`/exchange/rates?fromCurrency=${rate.core.sourceCurrency}&toCurrency=${rate.core.targetCurrency}`}
        >
          Pair history
        </Link>
      </div>
    </section>
  );
}
