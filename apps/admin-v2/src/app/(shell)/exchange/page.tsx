import Link from 'next/link';

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
        <section className="panel pageHeader">
          <div>
            <h1>Exchange workspace</h1>
            <p className="muted">
              Narrow MVP-2 surface only: exchange read visibility, exact six canonical actions and truthful overview
              linkage.
            </p>
          </div>
          <div className="actionsRow">
            <Link className="secondaryButton" href="/overview">
              Back to overview
            </Link>
          </div>
        </section>

        <section className="statsGrid">
          {sections.map((section) => (
            <article className="panel" key={section.href}>
              <h2>{section.title}</h2>
              <p className="muted">{section.description}</p>
              <Link className="secondaryButton" href={section.href}>
                Open
              </Link>
            </article>
          ))}
        </section>
      </>
    </WorkspaceLayout>
  );
}
