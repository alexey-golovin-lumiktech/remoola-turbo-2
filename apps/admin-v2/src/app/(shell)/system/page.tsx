import { ActionGhost } from '../../../components/action-ghost';
import { Panel } from '../../../components/panel';
import { mutedTextClass } from '../../../components/ui-classes';
import { WorkspaceLayout } from '../../../components/workspace-layout';
import { getSystemSummary, type SystemSummaryCard } from '../../../lib/admin-api.server';
import { formatDateTime } from '../../../lib/admin-format';

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
    <WorkspaceLayout workspace="system">
      <>
        <Panel
          title="System"
          description="Read-only maturity surface for cross-domain product and background health, with drilldown into existing operator workspaces."
          actions={<p className={mutedTextClass}>Computed: {formatDateTime(summary?.computedAt)}</p>}
        />

        <section className="statsGrid">
          {cards.length === 0 ? (
            <Panel title="Summary unavailable">
              <p className={mutedTextClass}>
                System summary is not currently available from the read-only backend contract. Use existing domain
                workspaces for direct investigation.
              </p>
            </Panel>
          ) : null}

          {cards.map((card) => (
            <Panel
              key={card.label}
              title={card.label}
              description={`Status: ${getStatusLabel(card.status)}`}
              actions={
                card.primaryAction ? (
                  <ActionGhost href={card.primaryAction.href}>{card.primaryAction.label}</ActionGhost>
                ) : null
              }
            >
              <p className={mutedTextClass}>{card.explanation}</p>
              <ul>
                {card.facts.map((fact) => (
                  <li key={`${card.label}-${fact.label}`}>
                    <span>{fact.label}: </span>
                    <span>{fact.value == null ? `-` : String(fact.value)}</span>
                  </li>
                ))}
              </ul>
              {card.escalationHint ? <p className={mutedTextClass}>Escalation: {card.escalationHint}</p> : null}
            </Panel>
          ))}
        </section>
      </>
    </WorkspaceLayout>
  );
}
