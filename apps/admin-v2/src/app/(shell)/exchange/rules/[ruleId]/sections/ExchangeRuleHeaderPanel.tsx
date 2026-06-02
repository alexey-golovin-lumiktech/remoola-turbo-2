import Link from 'next/link';

import { type ExchangeRuleCasePageData } from '../page.loader';

export function ExchangeRuleHeaderPanel({ rule }: { rule: ExchangeRuleCasePageData[`rule`] }) {
  return (
    <section className="panel pageHeader">
      <div>
        <h1>Exchange rule</h1>
        <p className="muted">
          {rule.core.sourceCurrency}/{rule.core.targetCurrency} · {rule.core.enabled ? `Enabled` : `Paused`}
        </p>
        <p className="muted mono">{rule.id}</p>
        <div className="pillRow">
          <span className="pill">{rule.core.enabled ? `Enabled` : `Paused`}</span>
          <span className="pill">Version {rule.version}</span>
        </div>
      </div>
      <div className="actionsRow">
        <Link className="secondaryButton" href="/exchange/rules">
          Back to rules
        </Link>
        <Link className="secondaryButton" href={`/consumers/${rule.consumer.id}`}>
          Consumer case
        </Link>
      </div>
    </section>
  );
}
