import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ActionGhost } from '../../../../components/action-ghost';
import { AdminSurfaceAccessDenied, AdminSurfaceUnavailable } from '../../../../components/admin-surface-state';
import { AssignmentCard } from '../../../../components/assignment-card';
import { Panel } from '../../../../components/panel';
import { getAdminIdentity, getAdmins, getDocumentCaseResult, getDocumentTags } from '../../../../lib/admin-api.server';
import { formatBytes, formatDateTime } from '../../../../lib/admin-format';
import {
  claimDocumentAssignmentAction,
  reassignDocumentAssignmentAction,
  releaseDocumentAssignmentAction,
  retagDocumentAction,
} from '../../../../lib/admin-mutations.server';
import { readReturnTo } from '../../../../lib/navigation-context';

export default async function DocumentCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ documentId: string }>;
  searchParams?: Promise<{ from?: string }>;
}) {
  const { documentId } = await params;
  const resolvedSearchParams = await searchParams;
  const [identity, documentCaseResult, tags] = await Promise.all([
    getAdminIdentity(),
    getDocumentCaseResult(documentId),
    getDocumentTags(),
  ]);

  if (documentCaseResult.status === `not_found`) {
    notFound();
  }
  if (documentCaseResult.status === `forbidden`) {
    return (
      <AdminSurfaceAccessDenied
        title="Document case unavailable"
        description="Your admin identity can sign in, but it cannot access this document surface."
      />
    );
  }
  if (documentCaseResult.status === `error`) {
    return (
      <AdminSurfaceUnavailable
        title="Document case unavailable"
        description="The document case could not be loaded from the backend right now. Retry shortly."
      />
    );
  }
  const documentCase = documentCaseResult.data;

  const canManage = identity?.capabilities.includes(`documents.manage`) ?? false;
  const selectedTags = new Set(documentCase.tags.map((tag) => tag.id));
  const tagMetadata = new Map((tags?.items ?? []).map((tag) => [tag.id, tag]));

  const currentAssignment = documentCase.assignment.current;
  const currentAdminId = identity?.id ?? null;
  const ownsAssignment = Boolean(
    currentAssignment && currentAdminId && currentAssignment.assignedTo.id === currentAdminId,
  );
  const canManageAssignments = Boolean(identity?.capabilities?.includes(`assignments.manage`));
  const canReassignAssignments = identity?.role === `SUPER_ADMIN`;
  const canClaim = canManageAssignments && !currentAssignment;
  const canRelease = Boolean(currentAssignment && canManageAssignments && (ownsAssignment || canReassignAssignments));
  const canReassign = Boolean(currentAssignment && canReassignAssignments);
  const backToQueueHref = readReturnTo(resolvedSearchParams?.from, `/documents`);
  const reassignCandidatesResponse = canReassign ? await getAdmins({ page: 1, pageSize: 50, status: `ACTIVE` }) : null;
  const reassignCandidates = (reassignCandidatesResponse?.items ?? []).filter(
    (admin) => admin.id !== currentAssignment?.assignedTo.id,
  );

  return (
    <>
      <Panel
        title="Document detail"
        description={documentCase.core.originalName}
        actions={
          <div className="flex flex-wrap gap-2">
            <ActionGhost href={backToQueueHref}>Back to queue</ActionGhost>
            <ActionGhost href="/documents/tags">Tags</ActionGhost>
            <a
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-input border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/72 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white/90"
              href={documentCase.downloadUrl}
              target="_blank"
              rel="noreferrer"
            >
              Secure open
            </a>
          </div>
        }
        surface="primary"
      >
        <p className="muted mono">{documentCase.id}</p>
        <div className="pillRow">
          <span className="pill">{documentCase.core.access}</span>
          <span className="pill">{documentCase.core.mimeType ?? `Unknown MIME`}</span>
          {documentCase.core.deletedAt ? <span className="pill">Soft-deleted</span> : null}
        </div>
      </Panel>

      <section className="statsGrid">
        <article className="panel">
          <h3>Core evidence context</h3>
          <p className="muted">Created: {formatDateTime(documentCase.core.createdAt)}</p>
          <p className="muted">Updated: {formatDateTime(documentCase.updatedAt)}</p>
          <p className="muted">Size: {formatBytes(documentCase.core.size)}</p>
          <p className="muted">Data freshness: {documentCase.dataFreshnessClass}</p>
          <p className="muted">Version: {documentCase.version}</p>
        </article>

        <article className="panel">
          <h3>Owner case links</h3>
          {!documentCase.consumer ? (
            <p className="muted">No active owner link is available.</p>
          ) : (
            <div className="formStack">
              <strong>{documentCase.consumer.email ?? documentCase.consumer.id}</strong>
              <div className="actionsRow">
                <Link className="secondaryButton" href={`/consumers/${documentCase.consumer.id}`}>
                  Consumer case
                </Link>
                <Link className="secondaryButton" href={`/verification/${documentCase.consumer.id}`}>
                  Verification case
                </Link>
              </div>
            </div>
          )}
        </article>

        <article className="panel">
          <h3>Payment linkage</h3>
          {documentCase.linkedPaymentRequests.length === 0 ? (
            <p className="muted">No linked payment request is confirmed for this document.</p>
          ) : (
            <div className="formStack">
              {documentCase.linkedPaymentRequests.map((payment) => (
                <div key={payment.id} className="formStack">
                  <Link href={`/payments/${payment.id}`}>{payment.id}</Link>
                  <p className="muted">
                    {payment.amount} · {payment.status}
                  </p>
                  <p className="muted">Created: {formatDateTime(payment.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="detailGrid">
        <article className="panel">
          <h2>Visible tags</h2>
          <div className="pillRow">
            {documentCase.tags.length === 0 ? <span className="muted">No tags assigned.</span> : null}
            {documentCase.tags.map((tag) => (
              <span className="pill" key={tag.id}>
                {tag.name}
                {tagMetadata.get(tag.id)?.reserved ? ` (system-managed)` : ``}
              </span>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Boundary notes</h2>
          <p className="muted">
            This case shows evidence context only. There is no document review queue, upload console, bucket
            diagnostics, or generic admin patch endpoint in this slice.
          </p>
        </article>
      </section>

      <AssignmentCard
        resourceId={documentCase.id}
        assignment={documentCase.assignment}
        reassignCandidates={reassignCandidates}
        capabilities={{ canClaim, canRelease, canReassign }}
        actions={{
          claim: claimDocumentAssignmentAction,
          release: releaseDocumentAssignmentAction,
          reassign: reassignDocumentAssignmentAction,
        }}
        copy={{ claimReasonPlaceholder: `Why are you claiming this document?` }}
      />

      {canManage ? (
        <section className="panel">
          <div className="pageHeader">
            <div>
              <h2>Retag document</h2>
              <p className="muted">Exact `document_retag` action only. Reserved invoice tags remain read-only.</p>
            </div>
          </div>

          {documentCase.core.deletedAt ? (
            <p className="muted">Soft-deleted documents stay investigation-only. Retagging is disabled.</p>
          ) : (
            <form action={retagDocumentAction.bind(null, documentCase.id)} className="formStack">
              <input type="hidden" name="version" value={String(documentCase.version)} />
              <div className="pillRow">
                {(tags?.items ?? []).map((tag) => (
                  <label className="pill" key={tag.id}>
                    <input
                      type="checkbox"
                      name="tagIds"
                      value={tag.id}
                      defaultChecked={selectedTags.has(tag.id)}
                      disabled={tag.reserved}
                    />
                    {tag.name}
                    {tag.reserved ? ` (system-managed)` : ``}
                  </label>
                ))}
              </div>
              <button className="secondaryButton" type="submit">
                Save tags
              </button>
            </form>
          )}
        </section>
      ) : null}
    </>
  );
}
