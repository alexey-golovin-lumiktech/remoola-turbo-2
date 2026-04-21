import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AssignmentCard } from '../../../../components/assignment-card';
import { getAdminIdentity, getAdmins, getPaymentCase } from '../../../../lib/admin-api.server';
import {
  claimPaymentRequestAssignmentAction,
  reassignPaymentRequestAssignmentAction,
  releasePaymentRequestAssignmentAction,
} from '../../../../lib/admin-mutations.server';

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

function renderMetadata(value: Record<string, unknown> | null | undefined) {
  if (!value || Object.keys(value).length === 0) {
    return <p className="muted">No metadata.</p>;
  }

  return <pre className="mono">{JSON.stringify(value, null, 2)}</pre>;
}

export default async function PaymentCasePage({ params }: { params: Promise<{ paymentRequestId: string }> }) {
  const { paymentRequestId } = await params;
  const [paymentCase, identity] = await Promise.all([getPaymentCase(paymentRequestId), getAdminIdentity()]);

  if (!paymentCase) {
    notFound();
  }

  const currentAssignment = paymentCase.assignment.current;
  const currentAdminId = identity?.id ?? null;
  const ownsAssignment = Boolean(
    currentAssignment && currentAdminId && currentAssignment.assignedTo.id === currentAdminId,
  );
  const canManageAssignments = Boolean(identity?.capabilities?.includes(`assignments.manage`));
  const canReassignAssignments = identity?.role === `SUPER_ADMIN`;
  const canClaim = canManageAssignments && !currentAssignment;
  const canRelease = Boolean(currentAssignment && canManageAssignments && (ownsAssignment || canReassignAssignments));
  const canReassign = Boolean(currentAssignment && canReassignAssignments);
  const reassignCandidatesResponse = canReassign ? await getAdmins({ page: 1, pageSize: 50, status: `ACTIVE` }) : null;
  const reassignCandidates = (reassignCandidatesResponse?.items ?? []).filter(
    (admin) => admin.id !== currentAssignment?.assignedTo.id,
  );

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>Payment Request</h1>
          <p className="muted mono">{paymentCase.id}</p>
          <div className="pillRow">
            <span className="pill">{paymentCase.core.effectiveStatus}</span>
            <span className="pill">{paymentCase.core.currencyCode}</span>
            {paymentCase.core.paymentRail ? <span className="pill">{paymentCase.core.paymentRail}</span> : null}
            {paymentCase.staleWarning ? <span className="pill">Persisted status stale</span> : null}
            {paymentCase.core.deletedAt ? <span className="pill">Soft-deleted request</span> : null}
          </div>
        </div>
        <div className="actionsRow">
          {paymentCase.payer.id ? (
            <Link className="secondaryButton" href={`/consumers/${paymentCase.payer.id}`}>
              Payer case
            </Link>
          ) : null}
          {paymentCase.requester.id ? (
            <Link className="secondaryButton" href={`/consumers/${paymentCase.requester.id}`}>
              Requester case
            </Link>
          ) : null}
          <Link className="secondaryButton" href={`/audit/admin-actions?resourceId=${paymentCase.id}`}>
            Related admin actions
          </Link>
        </div>
      </section>

      <section className="statsGrid">
        <article className="panel">
          <h3>Request core</h3>
          <p className="muted">
            Amount: {paymentCase.core.amount} {paymentCase.core.currencyCode}
          </p>
          <p className="muted">Persisted: {paymentCase.core.persistedStatus}</p>
          <p className="muted">Effective: {paymentCase.core.effectiveStatus}</p>
          <p className="muted">Case truth follows the latest linked ledger outcome, not the earliest one.</p>
          <p className="muted">Description: {paymentCase.core.description ?? `-`}</p>
        </article>
        <article className="panel">
          <h3>Participants</h3>
          <p className="muted">Payer: {paymentCase.payer.email ?? paymentCase.payer.id ?? `-`}</p>
          <p className="muted">Requester: {paymentCase.requester.email ?? paymentCase.requester.id ?? `-`}</p>
          <p className="muted">Data freshness: {paymentCase.dataFreshnessClass}</p>
        </article>
        <article className="panel">
          <h3>Dates</h3>
          <p className="muted">Created: {formatDate(paymentCase.core.createdAt)}</p>
          <p className="muted">Sent: {formatDate(paymentCase.core.sentDate)}</p>
          <p className="muted">Due: {formatDate(paymentCase.core.dueDate)}</p>
          <p className="muted">Updated: {formatDate(paymentCase.updatedAt)}</p>
          <p className="muted">Version: {paymentCase.version}</p>
        </article>
      </section>

      <section className="detailGrid">
        <article className="panel">
          <h2>Attachments / documents</h2>
          <div className="formStack">
            {paymentCase.attachments.length === 0 ? <p className="muted">No attachments.</p> : null}
            {paymentCase.attachments.map((attachment) => (
              <div className="panel" key={attachment.id}>
                <strong>{attachment.name}</strong>
                <p className="muted">{attachment.mimetype}</p>
                <p className="muted">
                  {attachment.size} bytes · {formatDate(attachment.createdAt)}
                </p>
                {attachment.deletedAt ? (
                  <p className="muted">Attachment soft-deleted: {formatDate(attachment.deletedAt)}</p>
                ) : null}
                {attachment.resourceDeletedAt ? (
                  <p className="muted">Resource soft-deleted: {formatDate(attachment.resourceDeletedAt)}</p>
                ) : null}
                <div className="actionsRow">
                  {paymentCase.requester.id ? (
                    <Link className="secondaryButton" href={`/consumers/${paymentCase.requester.id}`}>
                      Requester documents context
                    </Link>
                  ) : null}
                  <a className="secondaryButton" href={attachment.downloadUrl} target="_blank" rel="noreferrer">
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Related ledger entries</h2>
          <div className="formStack">
            {paymentCase.ledgerEntries.length === 0 ? <p className="muted">No ledger entries.</p> : null}
            {paymentCase.ledgerEntries.map((entry) => (
              <div className="panel" key={entry.id}>
                <strong>{entry.type}</strong>
                <p className="muted">
                  {entry.amount} {entry.currencyCode}
                </p>
                <p className="muted">Effective status: {entry.effectiveStatus}</p>
                {entry.deletedAt ? (
                  <p className="muted">Ledger entry soft-deleted: {formatDate(entry.deletedAt)}</p>
                ) : null}
                <div className="actionsRow">
                  <Link className="secondaryButton" href={`/ledger/${entry.id}`}>
                    Open ledger case
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <AssignmentCard
        resourceId={paymentCase.id}
        assignment={paymentCase.assignment}
        reassignCandidates={reassignCandidates}
        capabilities={{ canClaim, canRelease, canReassign }}
        actions={{
          claim: claimPaymentRequestAssignmentAction,
          release: releasePaymentRequestAssignmentAction,
          reassign: reassignPaymentRequestAssignmentAction,
        }}
        copy={{ claimReasonPlaceholder: `Why are you claiming this payment request?` }}
      />

      <section className="detailGrid">
        <article className="panel">
          <h2>Timeline</h2>
          <div className="formStack">
            {paymentCase.timeline.map((item, index) => (
              <div className="panel" key={`${item.event}-${index}`}>
                <strong>{item.event}</strong>
                <p className="muted">{formatDate(item.timestamp)}</p>
                {renderMetadata(item.metadata)}
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Audit context</h2>
          <div className="formStack">
            {paymentCase.auditContext.length === 0 ? <p className="muted">No related admin actions.</p> : null}
            {paymentCase.auditContext.map((item) => (
              <div className="panel" key={item.id}>
                <strong>{item.action}</strong>
                <p className="muted">{item.adminEmail ?? `Unknown admin`}</p>
                <p className="muted">{formatDate(item.createdAt)}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
