import { ActionGhost } from '../../../components/action-ghost';
import { Panel } from '../../../components/panel';
import { TinyPill } from '../../../components/tiny-pill';
import { WorkspaceLayout } from '../../../components/workspace-layout';

export default function ExchangeWorkspacePage() {
  const sections = [
    {
      href: `/exchange/rates`,
      title: `Rates`,
      description: `Current and historical FX rates with provider, pair, status and staleness visibility.`,
    },
    {
      href: `/exchange/rules`,
      title: `Auto-conversion rules`,
      description: `Per-consumer thresholds, enabled state, run timing and the latest persisted execution summary.`,
    },
    {
      href: `/exchange/scheduled`,
      title: `Scheduled conversions`,
      description: `Queue visibility for pending, failed and executed scheduled FX with consumer and ledger linkage.`,
    },
  ];

  return (
    <WorkspaceLayout workspace="exchange">
      <>
        <Panel
          title="Exchange workspace"
          description="Exchange operations hub for rate integrity, rule governance, and scheduled conversion follow-up."
          actions={<ActionGhost href="/overview">Back to overview</ActionGhost>}
          surface="meta"
        />

        <section className="statsGrid">
          {sections.map((section) => (
            <Panel
              key={section.href}
              title={section.title}
              description={section.description}
              actions={<TinyPill>Actionable</TinyPill>}
              surface="meta"
            >
              <div className="pt-1">
                <ActionGhost href={section.href}>Open</ActionGhost>
              </div>
            </Panel>
          ))}
        </section>
      </>
    </WorkspaceLayout>
  );
}
