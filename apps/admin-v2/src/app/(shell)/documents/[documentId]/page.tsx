import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AssignmentCard } from '../../../../components/assignment-card';
import { getAdminIdentity, getAdmins, getDocumentCase, getDocumentTags } from '../../../../lib/admin-api.server';
import {
  claimDocumentAssignmentAction,
  reassignDocumentAssignmentAction,
  releaseDocumentAssignmentAction,
  retagDocumentAction,
} from '../../../../lib/admin-mutations.server';

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

function formatBytes(value: number | null | undefined): string {
  const safeValue = value ?? NaN;
  if (!Number.isFinite(safeValue)) {
    return `-`;
  }
  if (safeValue < 1024) {
    return `${safeValue} B`;
  }
  if (safeValue < 1024 * 1024) {
    return `${(safeValue / 1024).toFixed(1)} KB`;
  }
  return `${(safeValue / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentCasePage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  const [identity, documentCase, tags] = await Promise.all([
    getAdminIdentity(),
    getDocumentCase(documentId),
    getDocumentTags(),
  ]);

  if (!documentCase) {
    notFound();
  }

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
  const reassignCandidatesResponse = canReassign ? await getAdmins({ page: 1, pageSize: 50, status: `ACTIVE` }) : null;
  const reassignCandidates = (reassignCandidatesResponse?.items ?? []).filter(
    (admin) => admin.id !== currentAssignment?.assignedTo.id,
  );

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>Document detail</h1>
          <p className="muted">{documentCase.core.originalName}</p>
          <p className="muted mono">{documentCase.id}</p>
          <div className="pillRow">
            <span className="pill">{documentCase.core.access}</span>
            <span className="pill">{documentCase.core.mimeType ?? `Unknown MIME`}</span>
            {documentCase.core.deletedAt ? <span className="pill">Soft-deleted</span> : null}
          </div>
        </div>
        <div className="actionsRow">
          <Link className="secondaryButton" href="/documents">
            Documents explorer
          </Link>
          <Link className="secondaryButton" href="/documents/tags">
            Tags
          </Link>
          <a className="secondaryButton" href={documentCase.downloadUrl} target="_blank" rel="noreferrer">
            Secure open
          </a>
        </div>
      </section>

      <section className="statsGrid">
        <article className="panel">
          <h3>Core evidence context</h3>
          <p className="muted">Created: {formatDate(documentCase.core.createdAt)}</p>
          <p className="muted">Updated: {formatDate(documentCase.updatedAt)}</p>
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
                  <p className="muted">Created: {formatDate(payment.createdAt)}</p>
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
