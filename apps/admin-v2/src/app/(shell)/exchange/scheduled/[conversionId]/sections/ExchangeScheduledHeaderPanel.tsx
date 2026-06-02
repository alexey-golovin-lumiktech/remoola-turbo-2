import Link from 'next/link';

import { type ExchangeScheduledCasePageData } from '../page.loader';

export function ExchangeScheduledHeaderPanel({
  conversion,
}: {
  conversion: ExchangeScheduledCasePageData[`conversion`];
}) {
  return (
    <section className="panel pageHeader">
      <div>
        <h1>Scheduled FX conversion</h1>
        <p className="muted">
          {conversion.core.sourceCurrency}/{conversion.core.targetCurrency} · {conversion.core.status}
        </p>
        <p className="muted mono">{conversion.id}</p>
        <div className="pillRow">
          <span className="pill">{conversion.core.status}</span>
          <span className="pill">Attempts {conversion.core.attempts}</span>
        </div>
      </div>
      <div className="actionsRow">
        <Link className="secondaryButton" href="/exchange/scheduled">
          Back to scheduled
        </Link>
        <Link className="secondaryButton" href={`/consumers/${conversion.consumer.id}`}>
          Consumer case
        </Link>
        {conversion.linkedRuleId ? (
          <Link className="secondaryButton" href={`/exchange/rules/${conversion.linkedRuleId}`}>
            Linked rule
          </Link>
        ) : null}
      </div>
    </section>
  );
}
