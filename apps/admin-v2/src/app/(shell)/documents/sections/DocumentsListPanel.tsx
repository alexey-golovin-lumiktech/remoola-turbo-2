import Link from 'next/link';

import {
  renderDocumentAccessDetails,
  renderDocumentAssignee,
  renderDocumentAssigneeSummary,
  renderDocumentOwners,
  renderDocumentPaymentLinks,
  renderDocumentPaymentSummary,
  renderDocumentSelection,
  renderDocumentTagBadges,
  renderDocumentTagSummary,
} from './documents-shared';
import { DenseTable } from '../../../../components/dense-table';
import { MobileQueueCard, MobileQueueSection } from '../../../../components/mobile-queue-card';
import { Panel } from '../../../../components/panel';
import { TabletRow } from '../../../../components/tablet-row';
import { TinyPill } from '../../../../components/tiny-pill';
import { buttonRowClass, detailsSummaryClass, mutedTextClass, stackClass } from '../../../../components/ui-classes';
import { type getDocuments, type getDocumentTags } from '../../../../lib/admin-api/documents.server';
import { formatDateTime } from '../../../../lib/admin-format';
import { bulkTagDocumentsAction } from '../../../../lib/admin-mutations/documents.server';

function ExplorerTable({
  canManage,
  documents,
}: {
  canManage: boolean;
  documents: Awaited<ReturnType<typeof getDocuments>> | null;
}) {
  const items = documents?.items ?? [];

  return (
    <section className="panel">
      <div className="pageHeader">
        <div>
          <h2>Resource explorer</h2>
          <p className="muted">
            Total matched: {documents?.total ?? 0}. Soft-deleted resources remain visible only when explicitly
            requested.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="muted">No evidence-linked documents matched the current filters.</p>
      ) : (
        <>
          <div className="readSurface md:hidden" data-view="mobile">
            <div className="queueCards">
              {items.map((document) => (
                <MobileQueueCard
                  key={document.id}
                  id={document.id}
                  href={`/documents/${document.id}`}
                  eyebrow="Evidence file"
                  title={document.originalName}
                  subtitle={document.id}
                  trailing={<span className="pill">{document.access}</span>}
                  badges={
                    <>
                      <span className="pill">{document.mimeType ?? `Unknown MIME`}</span>
                      {document.tags.length > 0 ? <span className="pill">{document.tags.length} tags</span> : null}
                    </>
                  }
                >
                  <MobileQueueSection title="Evidence summary">
                    <div className="muted">Created: {formatDateTime(document.createdAt)}</div>
                    <div className="muted">Assigned: {renderDocumentAssigneeSummary(document)}</div>
                    <div className="muted">Tags: {renderDocumentTagSummary(document)}</div>
                    <div className="muted">Payments: {renderDocumentPaymentSummary(document)}</div>
                  </MobileQueueSection>
                  <MobileQueueSection title="Ownership and access" compact>
                    <div className="formStack">{renderDocumentOwners(document)}</div>
                    {renderDocumentAccessDetails(document)}
                    {canManage ? (
                      <label className="field">
                        <span>Select for batch action</span>
                        {renderDocumentSelection(document)}
                      </label>
                    ) : null}
                  </MobileQueueSection>
                </MobileQueueCard>
              ))}
            </div>
          </div>

          <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
            <div className="condensedList">
              {items.map((document) => (
                <TabletRow
                  key={document.id}
                  eyebrow="Evidence file"
                  primary={
                    <>
                      <Link href={`/documents/${document.id}`}>
                        <strong>{document.originalName}</strong>
                      </Link>
                      <div className="muted mono">{document.id}</div>
                      <div className="muted">Created: {formatDateTime(document.createdAt)}</div>
                    </>
                  }
                  badges={
                    <>
                      <span className="pill">{document.access}</span>
                      <span className="pill">{document.mimeType ?? `Unknown MIME`}</span>
                    </>
                  }
                  cells={[
                    <div key="owners" className="formStack">
                      {renderDocumentOwners(document)}
                    </div>,
                    <div key="assigned-tags">
                      <div>{renderDocumentAssigneeSummary(document)}</div>
                      <div className="muted">{renderDocumentTagSummary(document)}</div>
                    </div>,
                    <div key="payments" className="formStack">
                      {renderDocumentPaymentLinks(document)}
                    </div>,
                    <div key="access-size">
                      {renderDocumentAccessDetails(document)}
                      {canManage ? (
                        <label className="field">
                          <span>Select for batch action</span>
                          {renderDocumentSelection(document)}
                        </label>
                      ) : null}
                    </div>,
                  ]}
                />
              ))}
            </div>
          </div>

          <div className="readSurface hidden xl:block" data-view="desktop">
            <DenseTable
              headers={
                canManage
                  ? [`Select`, `Document`, `Owners`, `Assigned to`, `Tags`, `Payment linkage`, `Access / size`]
                  : [`Document`, `Owners`, `Assigned to`, `Tags`, `Payment linkage`, `Access / size`]
              }
            >
              {items.map((document) => (
                <tr key={document.id}>
                  {canManage ? <td>{renderDocumentSelection(document)}</td> : null}
                  <td>
                    <div className="formStack">
                      <strong>{document.originalName}</strong>
                      <span className="muted mono">{document.id}</span>
                      <span className="muted">Created: {formatDateTime(document.createdAt)}</span>
                      <div className="actionsRow">
                        <Link className="secondaryButton" href={`/documents/${document.id}`}>
                          Open detail
                        </Link>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="formStack">{renderDocumentOwners(document)}</div>
                  </td>
                  <td>{renderDocumentAssignee(document)}</td>
                  <td>{renderDocumentTagBadges(document)}</td>
                  <td>
                    <div className="formStack">{renderDocumentPaymentLinks(document)}</div>
                  </td>
                  <td>{renderDocumentAccessDetails(document)}</td>
                </tr>
              ))}
            </DenseTable>
          </div>
        </>
      )}
    </section>
  );
}

function BulkTagPanel({ tags }: { tags: Awaited<ReturnType<typeof getDocumentTags>> | null }) {
  const allTags = tags?.items ?? [];
  const availableTags = allTags.filter((tag) => !tag.reserved);
  const reservedTags = allTags.length - availableTags.length;

  return (
    <Panel
      title="Batch action"
      description="Keep review and selection in the explorer first, then open this section to apply bulk tags."
      surface="meta"
    >
      <div className={stackClass}>
        <div className={buttonRowClass}>
          <TinyPill tone="cyan">{availableTags.length} selectable tags</TinyPill>
          {reservedTags > 0 ? <TinyPill>{reservedTags} system-managed</TinyPill> : null}
        </div>
        <p className={mutedTextClass}>
          This action stays intentionally secondary: review the evidence rows above, choose the exact documents there,
          then expand the batch controls only when you are ready to submit.
        </p>
        <details>
          <summary className={detailsSummaryClass}>Open bulk tag controls</summary>
          <div className="mt-4 flex flex-col gap-4">
            <div className="pillRow">
              {allTags.map((tag) => (
                <label className="pill" key={tag.id}>
                  <input type="checkbox" name="tagIds" value={tag.id} disabled={tag.reserved} />
                  {tag.name}
                  {tag.reserved ? ` (system-managed)` : ``}
                </label>
              ))}
            </div>
            <p className={mutedTextClass}>
              Select the documents to include from the explorer above, then submit this exact `document_bulk_tag`
              action.
            </p>
            <div>
              <button className="secondaryButton" type="submit">
                Bulk tag selected documents
              </button>
            </div>
          </div>
        </details>
      </div>
    </Panel>
  );
}

export function DocumentsListPanel({
  canManage,
  documents,
  tags,
}: {
  canManage: boolean;
  documents: Awaited<ReturnType<typeof getDocuments>> | null;
  tags: Awaited<ReturnType<typeof getDocumentTags>> | null;
}) {
  if (!canManage) {
    return <ExplorerTable canManage={false} documents={documents} />;
  }

  return (
    <form action={bulkTagDocumentsAction} className="formStack order-2">
      <Panel
        title="Review flow"
        description="Explore evidence first. Batch actions stay available, but visually secondary, until the review slice is clear."
        surface="meta"
      >
        <div className={buttonRowClass}>
          <TinyPill tone="cyan">Step 1: Review evidence</TinyPill>
          <TinyPill>Step 2: Select exact rows</TinyPill>
          <TinyPill>Step 3: Open batch action</TinyPill>
        </div>
      </Panel>
      <ExplorerTable canManage documents={documents} />
      <BulkTagPanel tags={tags} />
    </form>
  );
}
