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
          description="Read-only preview of product and background health. Use related workspaces for actual queue work or deeper investigation."
          actions={<p className={mutedTextClass}>Computed: {formatDateTime(summary?.computedAt)}</p>}
          surface="meta"
        />

        <section className="statsGrid">
          {cards.length === 0 ? (
            <Panel title="Summary unavailable" surface="meta">
              <p className={mutedTextClass}>
                System summary is not currently available from the shared service data. Use the related workspaces for
                detailed investigation.
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
              surface="meta"
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
