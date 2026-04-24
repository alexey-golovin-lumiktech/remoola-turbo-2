import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ActionGhost } from '../../../../components/action-ghost';
import { AdminSurfaceAccessDenied, AdminSurfaceUnavailable } from '../../../../components/admin-surface-state';
import { AssignmentCard } from '../../../../components/assignment-card';
import { Panel } from '../../../../components/panel';
import { getAdminIdentity, getAdmins, getLedgerEntryCaseResult } from '../../../../lib/admin-api.server';
import {
  claimLedgerEntryAssignmentAction,
  reassignLedgerEntryAssignmentAction,
  releaseLedgerEntryAssignmentAction,
} from '../../../../lib/admin-mutations.server';
import { readReturnTo } from '../../../../lib/navigation-context';

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

function renderObject(value: Record<string, unknown> | null | undefined) {
  if (!value || Object.keys(value).length === 0) {
    return <p className="muted">No metadata.</p>;
  }

  return <pre className="mono">{JSON.stringify(value, null, 2)}</pre>;
}

export default async function LedgerEntryCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ ledgerEntryId: string }>;
  searchParams?: Promise<{ from?: string }>;
}) {
  const { ledgerEntryId } = await params;
  const resolvedSearchParams = await searchParams;
  const [ledgerCaseResult, identity] = await Promise.all([getLedgerEntryCaseResult(ledgerEntryId), getAdminIdentity()]);

  if (ledgerCaseResult.status === `not_found`) {
    notFound();
  }
  if (ledgerCaseResult.status === `forbidden`) {
    return (
      <AdminSurfaceAccessDenied
        title="Ledger case unavailable"
        description="Your admin identity can sign in, but it cannot access this ledger surface."
      />
    );
  }
  if (ledgerCaseResult.status === `error`) {
    return (
      <AdminSurfaceUnavailable
        title="Ledger case unavailable"
        description="The ledger case could not be loaded from the backend right now. Retry shortly."
      />
    );
  }
  const ledgerCase = ledgerCaseResult.data;

  const currentAssignment = ledgerCase.assignment.current;
  const currentAdminId = identity?.id ?? null;
  const ownsAssignment = Boolean(
    currentAssignment && currentAdminId && currentAssignment.assignedTo.id === currentAdminId,
  );
  const canManageAssignments = Boolean(identity?.capabilities?.includes(`assignments.manage`));
  const canReassignAssignments = identity?.role === `SUPER_ADMIN`;
  const canClaim = canManageAssignments && !currentAssignment;
  const canRelease = Boolean(currentAssignment && canManageAssignments && (ownsAssignment || canReassignAssignments));
  const canReassign = Boolean(currentAssignment && canReassignAssignments);
  const backToQueueHref = readReturnTo(resolvedSearchParams?.from, `/ledger`);
  const reassignCandidatesResponse = canReassign ? await getAdmins({ page: 1, pageSize: 50, status: `ACTIVE` }) : null;
  const reassignCandidates = (reassignCandidatesResponse?.items ?? []).filter(
    (admin) => admin.id !== currentAssignment?.assignedTo.id,
  );

  return (
    <>
      <Panel
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
              <div className="panel" key={outcome.id}>
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
              <div className="panel" key={dispute.id}>
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
              <div className="panel" key={entry.id}>
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
            <div className="panel" key={item.id}>
              <strong>{item.action}</strong>
              <p className="muted">{item.adminEmail ?? `Unknown admin`}</p>
              <p className="muted">{formatDate(item.createdAt)}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
