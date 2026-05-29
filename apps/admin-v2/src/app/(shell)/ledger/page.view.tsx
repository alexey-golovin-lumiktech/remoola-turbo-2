import { type LedgerPageData } from './page.loader';
import { LedgerContextRail } from './sections/LedgerContextRail';
import { LedgerDisputesPanel } from './sections/LedgerDisputesPanel';
import { LedgerEntriesPanel } from './sections/LedgerEntriesPanel';
import { LedgerFilters } from './sections/LedgerFilters';
import { ActionGhost } from '../../../components/action-ghost';
import { Panel } from '../../../components/panel';
import { buttonRowClass } from '../../../components/ui-classes';
import { WorkspaceLayout } from '../../../components/workspace-layout';

export function LedgerPageView({ data }: { data: LedgerPageData }) {
  const { params, entries, disputes } = data;
  const {
    view,
    cursor,
    q,
    type,
    status,
    currencyCode,
    paymentRequestId,
    consumerId,
    amountSign,
    dateFrom,
    dateTo,
    buildHref,
  } = params;
  const entryItems = entries?.items ?? [];
  const disputeItems = disputes?.items ?? [];

  return (
    <WorkspaceLayout
      workspace="ledger"
      context={
        <LedgerContextRail
          view={view}
          entryCount={entryItems.length}
          disputeCount={disputeItems.length}
          cursor={cursor}
          q={q}
          type={type}
          status={status}
          currencyCode={currencyCode}
          amountSign={amountSign}
          paymentRequestId={paymentRequestId}
          consumerId={consumerId}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
      }
      contextTitle="Queue context"
      contextDescription="Current ledger/dispute slice, filter load, and nearby investigation workspaces."
    >
      <>
        <Panel
          eyebrow="Ledger queue"
          title="Ledger and Disputes"
          description="Ledger triage workspace for exact outcomes, anomaly follow-up, and dispute escalation context."
          actions={
            <div className={buttonRowClass}>
              <ActionGhost href={buildHref({ view: `entries` })}>Ledger entries</ActionGhost>
              <ActionGhost href={buildHref({ view: `disputes` })}>Disputes</ActionGhost>
            </div>
          }
        />

        <LedgerFilters
          view={view}
          q={q}
          type={type}
          status={status}
          currencyCode={currencyCode}
          amountSign={amountSign}
          paymentRequestId={paymentRequestId}
          consumerId={consumerId}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />

        {view === `entries` ? (
          <LedgerEntriesPanel entries={entries} buildHref={buildHref} />
        ) : (
          <LedgerDisputesPanel disputes={disputes} buildHref={buildHref} />
        )}
      </>
    </WorkspaceLayout>
  );
}
