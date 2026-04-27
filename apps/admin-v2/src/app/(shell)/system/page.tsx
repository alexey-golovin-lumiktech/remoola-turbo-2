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
  const healthyCount = cards.filter((card) => card.status === `healthy`).length;
  const watchCount = cards.filter((card) => card.status === `watch`).length;

  return (
    <WorkspaceLayout workspace="system">
      <>
        <Panel
          title="System"
          description="Triage surface for shared health signals, with direct hand-offs into alerts and related investigative workspaces."
          actions={
            <div className="actionsRow">
              <span className="pill" data-tone="emerald">
                {healthyCount} healthy
              </span>
              <span className="pill" data-tone={watchCount > 0 ? `amber` : `neutral`}>
                {watchCount} watch
              </span>
              <ActionGhost href="/system/alerts">Open alerts</ActionGhost>
              <p className={mutedTextClass}>Computed: {formatDateTime(summary?.computedAt)}</p>
            </div>
          }
          surface="primary"
        >
          <p className={mutedTextClass}>
            Shared operational health snapshot for webhook delivery, schedulers, ledger integrity and reference-data
            drift.
          </p>
        </Panel>

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
              surface={card.status === `healthy` ? `meta` : `support`}
            >
              <p className={mutedTextClass}>{card.explanation}</p>
              <ul className="mt-3 space-y-2 text-sm text-white/72">
                {card.facts.map((fact) => (
                  <li
                    key={`${card.label}-${fact.label}`}
                    className="rounded-2xl border border-white/6 bg-white/[0.025] px-3 py-2.5"
                  >
                    <span className="text-white/45">{fact.label}: </span>
                    <span>{fact.value == null ? `-` : String(fact.value)}</span>
                  </li>
                ))}
              </ul>
              {card.escalationHint ? (
                <p className="mt-3 text-sm leading-6 text-white/62">Escalation: {card.escalationHint}</p>
              ) : null}
            </Panel>
          ))}
        </section>
      </>
    </WorkspaceLayout>
  );
}
