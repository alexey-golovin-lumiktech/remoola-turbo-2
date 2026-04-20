import Link from 'next/link';

import { getSystemSummary, type SystemSummaryCard } from '../../../lib/admin-api.server';

const cardOrder = [
  `stripeWebhookHealth`,
  `schedulerHealth`,
  `ledgerAnomalies`,
  `emailDeliveryIssuePatterns`,
  `staleExchangeRateAlerts`,
] as const;

function getStatusLabel(status: SystemSummaryCard[`status`]) {
  if (status === `temporarily-unavailable`) {
    return `Temporarily unavailable`;
  }

  return status === `healthy` ? `Healthy` : `Watch`;
}

export default async function SystemPage() {
  const summary = await getSystemSummary();
  const cards = summary ? cardOrder.map((key) => summary.cards[key]) : [];

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>System</h1>
          <p className="muted">
            Read-only maturity surface for cross-domain product and background health, with drilldown into existing
            operator workspaces.
          </p>
        </div>
        <p className="muted">Computed: {summary?.computedAt ? new Date(summary.computedAt).toLocaleString() : `-`}</p>
      </section>

      <section className="statsGrid">
        {cards.length === 0 ? (
          <article className="panel">
            <h2>Summary unavailable</h2>
            <p className="muted">
              System summary is not currently available from the read-only backend contract. Use existing domain
              workspaces for direct investigation.
            </p>
          </article>
        ) : null}

        {cards.map((card) => (
          <article key={card.label} className="panel">
            <div className="pageHeader">
              <div>
                <h2>{card.label}</h2>
                <p className="muted">Status: {getStatusLabel(card.status)}</p>
              </div>
              {card.primaryAction ? (
                <Link className="secondaryButton" href={card.primaryAction.href}>
                  {card.primaryAction.label}
                </Link>
              ) : null}
            </div>
            <p className="muted">{card.explanation}</p>
            <ul>
              {card.facts.map((fact) => (
                <li key={`${card.label}-${fact.label}`}>
                  <span>{fact.label}: </span>
                  <span>{fact.value == null ? `-` : String(fact.value)}</span>
                </li>
              ))}
            </ul>
            {card.escalationHint ? <p className="muted">Escalation: {card.escalationHint}</p> : null}
          </article>
        ))}
      </section>
    </>
  );
}
