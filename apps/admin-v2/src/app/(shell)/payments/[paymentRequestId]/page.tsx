import { notFound } from 'next/navigation';

import { ActionGhost } from '../../../../components/action-ghost';
import { AssignmentCard } from '../../../../components/assignment-card';
import { Panel } from '../../../../components/panel';
import { TinyPill } from '../../../../components/tiny-pill';
import { monoMutedTextClass, mutedTextClass, panelClass, stackClass } from '../../../../components/ui-classes';
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
    return <p className={mutedTextClass}>No metadata.</p>;
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
      <Panel
        title="Payment Request"
        description={paymentCase.id}
        actions={
          <div className="flex flex-wrap gap-2">
            {paymentCase.payer.id ? (
              <ActionGhost href={`/consumers/${paymentCase.payer.id}`}>Payer case</ActionGhost>
            ) : null}
            {paymentCase.requester.id ? (
              <ActionGhost href={`/consumers/${paymentCase.requester.id}`}>Requester case</ActionGhost>
            ) : null}
            <ActionGhost href={`/audit/admin-actions?resourceId=${paymentCase.id}`}>Related admin actions</ActionGhost>
          </div>
        }
      >
        <p className={monoMutedTextClass}>{paymentCase.id}</p>
        <div className="pillRow">
          <TinyPill>{paymentCase.core.effectiveStatus}</TinyPill>
          <TinyPill>{paymentCase.core.currencyCode}</TinyPill>
          {paymentCase.core.paymentRail ? <TinyPill>{paymentCase.core.paymentRail}</TinyPill> : null}
          {paymentCase.staleWarning ? <TinyPill>Persisted status stale</TinyPill> : null}
          {paymentCase.core.deletedAt ? <TinyPill>Soft-deleted request</TinyPill> : null}
        </div>
      </Panel>

      <section className="statsGrid">
        <Panel>
          <h3>Request core</h3>
          <p className={mutedTextClass}>
            Amount: {paymentCase.core.amount} {paymentCase.core.currencyCode}
          </p>
          <p className={mutedTextClass}>Persisted: {paymentCase.core.persistedStatus}</p>
          <p className={mutedTextClass}>Effective: {paymentCase.core.effectiveStatus}</p>
          <p className={mutedTextClass}>Case truth follows the latest linked ledger outcome, not the earliest one.</p>
          <p className={mutedTextClass}>Description: {paymentCase.core.description ?? `-`}</p>
        </Panel>
        <Panel>
          <h3>Participants</h3>
          <p className={mutedTextClass}>Payer: {paymentCase.payer.email ?? paymentCase.payer.id ?? `-`}</p>
          <p className={mutedTextClass}>Requester: {paymentCase.requester.email ?? paymentCase.requester.id ?? `-`}</p>
          <p className={mutedTextClass}>Data freshness: {paymentCase.dataFreshnessClass}</p>
        </Panel>
        <Panel>
          <h3>Dates</h3>
          <p className={mutedTextClass}>Created: {formatDate(paymentCase.core.createdAt)}</p>
          <p className={mutedTextClass}>Sent: {formatDate(paymentCase.core.sentDate)}</p>
          <p className={mutedTextClass}>Due: {formatDate(paymentCase.core.dueDate)}</p>
          <p className={mutedTextClass}>Updated: {formatDate(paymentCase.updatedAt)}</p>
          <p className={mutedTextClass}>Version: {paymentCase.version}</p>
        </Panel>
      </section>

      <section className="detailGrid">
        <Panel title="Attachments / documents">
          <div className={stackClass}>
            {paymentCase.attachments.length === 0 ? <p className={mutedTextClass}>No attachments.</p> : null}
            {paymentCase.attachments.map((attachment) => (
              <div className={panelClass} key={attachment.id}>
                <strong>{attachment.name}</strong>
                <p className={mutedTextClass}>{attachment.mimetype}</p>
                <p className={mutedTextClass}>
                  {attachment.size} bytes · {formatDate(attachment.createdAt)}
                </p>
                {attachment.deletedAt ? (
                  <p className={mutedTextClass}>Attachment soft-deleted: {formatDate(attachment.deletedAt)}</p>
                ) : null}
                {attachment.resourceDeletedAt ? (
                  <p className={mutedTextClass}>Resource soft-deleted: {formatDate(attachment.resourceDeletedAt)}</p>
                ) : null}
                <div className="actionsRow">
                  {paymentCase.requester.id ? (
                    <ActionGhost href={`/consumers/${paymentCase.requester.id}`}>
                      Requester documents context
                    </ActionGhost>
                  ) : null}
                  <a
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-input border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/72 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white/90"
                    href={attachment.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Related ledger entries">
          <div className={stackClass}>
            {paymentCase.ledgerEntries.length === 0 ? <p className={mutedTextClass}>No ledger entries.</p> : null}
            {paymentCase.ledgerEntries.map((entry) => (
              <div className={panelClass} key={entry.id}>
                <strong>{entry.type}</strong>
                <p className={mutedTextClass}>
                  {entry.amount} {entry.currencyCode}
                </p>
                <p className={mutedTextClass}>Effective status: {entry.effectiveStatus}</p>
                {entry.deletedAt ? (
                  <p className={mutedTextClass}>Ledger entry soft-deleted: {formatDate(entry.deletedAt)}</p>
                ) : null}
                <div className="actionsRow">
                  <ActionGhost href={`/ledger/${entry.id}`}>Open ledger case</ActionGhost>
                </div>
              </div>
            ))}
          </div>
        </Panel>
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
        <Panel title="Timeline">
          <div className={stackClass}>
            {paymentCase.timeline.map((item, index) => (
              <div className={panelClass} key={`${item.event}-${index}`}>
                <strong>{item.event}</strong>
                <p className={mutedTextClass}>{formatDate(item.timestamp)}</p>
                {renderMetadata(item.metadata)}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Audit context">
          <div className={stackClass}>
            {paymentCase.auditContext.length === 0 ? <p className={mutedTextClass}>No related admin actions.</p> : null}
            {paymentCase.auditContext.map((item) => (
              <div className={panelClass} key={item.id}>
                <strong>{item.action}</strong>
                <p className={mutedTextClass}>{item.adminEmail ?? `Unknown admin`}</p>
                <p className={mutedTextClass}>{formatDate(item.createdAt)}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </>
  );
}
