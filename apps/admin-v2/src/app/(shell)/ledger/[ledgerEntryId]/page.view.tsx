import Link from 'next/link';

import { type LedgerEntryCasePageData } from './page.loader';
import { type LedgerEntryCasePagePermissions } from './page.permissions';
import { ActionGhost } from '../../../../components/action-ghost';
import { AssignmentCard } from '../../../../components/assignment-card';
import { ContextStat } from '../../../../components/context-stat';
import { Panel } from '../../../../components/panel';
import { nestedPanelClass, rawDataClass } from '../../../../components/ui-classes';
import { WorkspaceLayout } from '../../../../components/workspace-layout';
import { formatDateTime } from '../../../../lib/admin-format';
import {
  reassignLedgerEntryAssignmentAction,
  releaseLedgerEntryAssignmentAction,
  claimLedgerEntryAssignmentAction,
} from '../../../../lib/admin-mutations/ledger.server';

const formatDate = formatDateTime;

function renderObject(value: Record<string, unknown> | null | undefined) {
  if (!value || Object.keys(value).length === 0) {
    return <p className="muted">No metadata.</p>;
  }

  return <pre className={rawDataClass}>{JSON.stringify(value, null, 2)}</pre>;
}

export function LedgerEntryCasePageView({
  data,
  permissions,
}: {
  data: LedgerEntryCasePageData;
  permissions: LedgerEntryCasePagePermissions;
}) {
  const { ledgerCase, reassignCandidates, backToQueueHref } = data;
  const { canClaim, canRelease, canReassign } = permissions;

  const currentAssignment = ledgerCase.assignment.current;

  const context = (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <ContextStat label="Effective status" value={ledgerCase.core.effectiveStatus} tone="cyan" />
        <ContextStat
          label="Disputes"
          value={ledgerCase.disputes.length}
          tone={ledgerCase.disputes.length > 0 ? `amber` : `neutral`}
        />
        <ContextStat
          label="Assignment"
          value={currentAssignment ? `Assigned` : `Open`}
          tone={currentAssignment ? `cyan` : `neutral`}
        />
        <ContextStat label="Related entries" value={ledgerCase.relatedEntries.length} />
      </div>
      <div className="contextRailSection">
        <h4>Jump to</h4>
        <div className="contextRailLinks">
          <ActionGhost href={backToQueueHref}>Back to queue</ActionGhost>
          <ActionGhost href={`/consumers/${ledgerCase.consumer.id}`}>Consumer case</ActionGhost>
          {ledgerCase.paymentRequest ? (
            <ActionGhost href={`/payments/${ledgerCase.paymentRequest.id}`}>Payment request</ActionGhost>
          ) : null}
        </div>
      </div>
    </>
  );

  return (
    <WorkspaceLayout
      workspace="ledger-case"
      context={context}
      contextTitle="Ledger snapshot"
      contextDescription="Entry status, dispute posture, and related links for the current ledger investigation."
    >
      <>
        <Panel
          eyebrow="Ledger investigation"
          title="Ledger Entry"
          description={ledgerCase.id}
          actions={
            <div className="flex flex-wrap gap-2">
              <ActionGhost href={backToQueueHref}>Back to queue</ActionGhost>
              <ActionGhost href={`/consumers/${ledgerCase.consumer.id}`}>Consumer case</ActionGhost>
              {ledgerCase.paymentRequest ? (
                <ActionGhost href={`/payments/${ledgerCase.paymentRequest.id}`}>Payment request</ActionGhost>
              ) : null}
              {ledgerCase.paymentRequest ? (
                <ActionGhost href={`/audit/admin-actions?resourceId=${ledgerCase.paymentRequest.id}`}>
                  Related admin actions
                </ActionGhost>
              ) : null}
            </div>
          }
          surface="primary"
        >
          <div className="pillRow">
            <span className="pill">{ledgerCase.core.type}</span>
            <span className="pill">{ledgerCase.core.effectiveStatus}</span>
            <span className="pill">{ledgerCase.core.currencyCode}</span>
          </div>
        </Panel>

        <section className="statsGrid">
          <article className="panel">
            <h3>Core</h3>
            <p className="muted">Ledger id: {ledgerCase.core.ledgerId}</p>
            <p className="muted">
              Amount: {ledgerCase.core.amount} {ledgerCase.core.currencyCode}
            </p>
            <p className="muted">Persisted: {ledgerCase.core.persistedStatus}</p>
            <p className="muted">Effective: {ledgerCase.core.effectiveStatus}</p>
            <p className="muted">Current case status follows the latest recorded outcome.</p>
          </article>
          <article className="panel">
            <h3>Links</h3>
            <p className="muted">Consumer: {ledgerCase.consumer.email ?? ledgerCase.consumer.id}</p>
            <p className="muted">Payment request: {ledgerCase.paymentRequest?.id ?? `-`}</p>
            <p className="muted">Stripe id: {ledgerCase.core.stripeId ?? `-`}</p>
            <p className="muted">Idempotency key: {ledgerCase.core.idempotencyKey ?? `-`}</p>
          </article>
          <article className="panel">
            <h3>Fees and freshness</h3>
            <p className="muted">Fees type: {ledgerCase.core.feesType ?? `-`}</p>
            <p className="muted">Fees amount: {ledgerCase.core.feesAmount ?? `-`}</p>
            <p className="muted">Data freshness: {ledgerCase.dataFreshnessClass}</p>
            <p className="muted">Updated: {formatDate(ledgerCase.core.updatedAt)}</p>
          </article>
        </section>

        <section className="detailGrid">
          <article className="panel">
            <h2>Metadata</h2>
            {renderObject(ledgerCase.metadata)}
          </article>
          <article className="panel">
            <h2>Outcome timeline</h2>
            <div className="formStack">
              {ledgerCase.outcomes.length === 0 ? <p className="muted">No outcomes.</p> : null}
              {ledgerCase.outcomes.map((outcome) => (
                <div className={nestedPanelClass} key={outcome.id}>
                  <strong>{outcome.status}</strong>
                  <p className="muted">Source: {outcome.source ?? `-`}</p>
                  <p className="muted">External id: {outcome.externalId ?? `-`}</p>
                  <p className="muted">{formatDate(outcome.createdAt)}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="detailGrid">
          <article className="panel">
            <h2>Dispute records</h2>
            <div className="formStack">
              {ledgerCase.disputes.length === 0 ? <p className="muted">No disputes.</p> : null}
              {ledgerCase.disputes.map((dispute) => (
                <div className={nestedPanelClass} key={dispute.id}>
                  <strong>{dispute.stripeDisputeId}</strong>
                  <p className="muted">{formatDate(dispute.createdAt)}</p>
                  {renderObject(dispute.metadata)}
                </div>
              ))}
            </div>
          </article>
          <article className="panel">
            <h2>Related ledger chain</h2>
            <div className="formStack">
              {ledgerCase.relatedEntries.map((entry) => (
                <div className={nestedPanelClass} key={entry.id}>
                  <strong>{entry.type}</strong>
                  <p className="muted">
                    {entry.amount} {entry.currencyCode}
                  </p>
                  <p className="muted">Effective status: {entry.effectiveStatus}</p>
                  <div className="actionsRow">
                    <Link className="secondaryButton" href={`/ledger/${entry.id}`}>
                      Open entry
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <AssignmentCard
          resourceId={ledgerCase.id}
          assignment={ledgerCase.assignment}
          reassignCandidates={reassignCandidates}
          capabilities={{ canClaim, canRelease, canReassign }}
          actions={{
            claim: claimLedgerEntryAssignmentAction,
            release: releaseLedgerEntryAssignmentAction,
            reassign: reassignLedgerEntryAssignmentAction,
          }}
          copy={{ claimReasonPlaceholder: `Why are you claiming this entry?` }}
        />

        <section className="panel">
          <h2>Audit context</h2>
          <div className="formStack">
            {ledgerCase.auditContext.length === 0 ? <p className="muted">No related admin actions.</p> : null}
            {ledgerCase.auditContext.map((item) => (
              <div className={nestedPanelClass} key={item.id}>
                <strong>{item.action}</strong>
                <p className="muted">{item.adminEmail ?? `Unknown admin`}</p>
                <p className="muted">{formatDate(item.createdAt)}</p>
              </div>
            ))}
          </div>
        </section>
      </>
    </WorkspaceLayout>
  );
}
