import Link from 'next/link';

import { DenseTable } from '../../../components/dense-table';
import { MobileQueueCard } from '../../../components/mobile-queue-card';
import { TabletRow } from '../../../components/tablet-row';
import { WorkspaceLayout } from '../../../components/workspace-layout';
import { getAdminIdentity, getDocuments, getDocumentTags } from '../../../lib/admin-api.server';
import { bulkTagDocumentsAction } from '../../../lib/admin-mutations.server';

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

type DocumentsPageParams = Record<string, string | string[] | undefined>;

type DocumentItem = NonNullable<NonNullable<Awaited<ReturnType<typeof getDocuments>>>>[`items`][number];

function renderDocumentSelection(document: DocumentItem) {
  return <input type="checkbox" name="resourceVersion" value={`${document.id}:${document.version}`} />;
}

function renderDocumentOwners(document: DocumentItem) {
  if (!document.consumerId) {
    return <span className="muted">No active owner link.</span>;
  }

  return (
    <>
      <Link href={`/consumers/${document.consumerId}`}>{document.consumerEmail ?? document.consumerId}</Link>
      <Link href={`/verification/${document.consumerId}`}>Verification case</Link>
    </>
  );
}

function renderDocumentAssignee(document: DocumentItem) {
  if (!document.assignedTo) {
    return <span className="muted">—</span>;
  }

  return (
    <>
      <div>{document.assignedTo.name ?? document.assignedTo.email ?? document.assignedTo.id}</div>
      {document.assignedTo.email ? <div className="muted">{document.assignedTo.email}</div> : null}
    </>
  );
}

function renderDocumentAssigneeSummary(document: DocumentItem): string {
  if (!document.assignedTo) {
    return `—`;
  }

  return document.assignedTo.name ?? document.assignedTo.email ?? document.assignedTo.id;
}

function renderDocumentTagBadges(document: DocumentItem) {
  return (
    <div className="pillRow">
      {document.tags.length === 0 ? <span className="muted">No tags</span> : null}
      {document.tags.map((tag) => (
        <Link key={tag} className="pill" href={`/documents?tag=${encodeURIComponent(tag)}`}>
          {tag}
        </Link>
      ))}
    </div>
  );
}

function renderDocumentTagSummary(document: DocumentItem): string {
  if (document.tags.length === 0) {
    return `No tags`;
  }

  return document.tags.join(`, `);
}

function renderDocumentPaymentLinks(document: DocumentItem) {
  if (document.linkedPaymentRequestIds.length === 0) {
    return <span className="muted">No payment linkage.</span>;
  }

  return (
    <>
      {document.linkedPaymentRequestIds.map((paymentRequestId) => (
        <div key={paymentRequestId} className="formStack">
          <Link href={`/payments/${paymentRequestId}`}>{paymentRequestId}</Link>
        </div>
      ))}
    </>
  );
}

function renderDocumentPaymentSummary(document: DocumentItem): string {
  if (document.linkedPaymentRequestIds.length === 0) {
    return `No payment linkage.`;
  }

  return document.linkedPaymentRequestIds.join(`, `);
}

function renderDocumentAccessDetails(document: DocumentItem) {
  return (
    <div className="formStack">
      <span className="pill">{document.access}</span>
      <span className="pill">{document.mimeType ?? `Unknown MIME`}</span>
      <span className="muted">Size: {formatBytes(document.size)}</span>
    </div>
  );
}

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
                  title={document.originalName}
                  subtitle={document.id}
                  trailing={<span className="pill">{document.access}</span>}
                >
                  <div className="muted">Created: {formatDate(document.createdAt)}</div>
                  {canManage ? (
                    <label className="field">
                      <span>Select for bulk tag</span>
                      {renderDocumentSelection(document)}
                    </label>
                  ) : null}
                  <div className="muted">Owner</div>
                  <div className="formStack">{renderDocumentOwners(document)}</div>
                  <div className="muted">Assigned: {renderDocumentAssigneeSummary(document)}</div>
                  <div className="muted">Tags: {renderDocumentTagSummary(document)}</div>
                  <div className="muted">Payments: {renderDocumentPaymentSummary(document)}</div>
                  {renderDocumentAccessDetails(document)}
                </MobileQueueCard>
              ))}
            </div>
          </div>

          <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
            <div className="condensedList">
              {items.map((document) => (
                <TabletRow
                  key={document.id}
                  primary={
                    <>
                      <Link href={`/documents/${document.id}`}>
                        <strong>{document.originalName}</strong>
                      </Link>
                      <div className="muted mono">{document.id}</div>
                      <div className="muted">Created: {formatDate(document.createdAt)}</div>
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
                          <span>Select</span>
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
                      <span className="muted">Created: {formatDate(document.createdAt)}</span>
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

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<DocumentsPageParams> }) {
  const params = await searchParams;
  const page = Number(typeof params.page === `string` ? params.page : `1`) || 1;
  const includeDeleted = typeof params.includeDeleted === `string` && params.includeDeleted === `true`;
  const [identity, documents, tags] = await Promise.all([
    getAdminIdentity(),
    getDocuments({
      page,
      q: typeof params.q === `string` ? params.q : undefined,
      consumerId: typeof params.consumerId === `string` ? params.consumerId : undefined,
      access: typeof params.access === `string` ? params.access : undefined,
      mimetype: typeof params.mimetype === `string` ? params.mimetype : undefined,
      sizeMin: typeof params.sizeMin === `string` ? Number(params.sizeMin) : undefined,
      sizeMax: typeof params.sizeMax === `string` ? Number(params.sizeMax) : undefined,
      createdFrom: typeof params.createdFrom === `string` ? params.createdFrom : undefined,
      createdTo: typeof params.createdTo === `string` ? params.createdTo : undefined,
      paymentRequestId: typeof params.paymentRequestId === `string` ? params.paymentRequestId : undefined,
      tag: typeof params.tag === `string` ? params.tag : undefined,
      tagId: typeof params.tagId === `string` ? params.tagId : undefined,
      includeDeleted,
    }),
    getDocumentTags(),
  ]);
  const canManage = identity?.capabilities.includes(`documents.manage`) ?? false;

  return (
    <WorkspaceLayout workspace="documents">
      <>
        <section className="panel pageHeader">
          <div>
            <h1>Documents</h1>
            <p className="muted">
              Evidence review boundaries for uploaded resources linked to consumers or payment cases.
            </p>
            <p className="muted">
              This workspace stays investigation-first: no review queues, no storage diagnostics, no generic file
              administration.
            </p>
          </div>
          <div className="actionsRow">
            <Link className="secondaryButton" href="/documents/tags">
              Tag management
            </Link>
          </div>
        </section>

        <section className="panel">
          <form className="actionsRow" method="get">
            <input name="q" defaultValue={typeof params.q === `string` ? params.q : ``} placeholder="Name or id" />
            <input
              name="consumerId"
              defaultValue={typeof params.consumerId === `string` ? params.consumerId : ``}
              placeholder="Owner consumer id"
            />
            <input
              name="paymentRequestId"
              defaultValue={typeof params.paymentRequestId === `string` ? params.paymentRequestId : ``}
              placeholder="Payment request id"
            />
            <input name="tag" defaultValue={typeof params.tag === `string` ? params.tag : ``} placeholder="Tag name" />
            <select name="access" defaultValue={typeof params.access === `string` ? params.access : ``}>
              <option value="">Any access</option>
              <option value="PRIVATE">PRIVATE</option>
              <option value="PUBLIC">PUBLIC</option>
            </select>
            <input
              name="mimetype"
              defaultValue={typeof params.mimetype === `string` ? params.mimetype : ``}
              placeholder="MIME type"
            />
            <input
              name="sizeMin"
              type="number"
              min="0"
              defaultValue={typeof params.sizeMin === `string` ? params.sizeMin : ``}
              placeholder="Min bytes"
            />
            <input
              name="sizeMax"
              type="number"
              min="0"
              defaultValue={typeof params.sizeMax === `string` ? params.sizeMax : ``}
              placeholder="Max bytes"
            />
            <input
              name="createdFrom"
              type="datetime-local"
              defaultValue={typeof params.createdFrom === `string` ? params.createdFrom.slice(0, 16) : ``}
            />
            <input
              name="createdTo"
              type="datetime-local"
              defaultValue={typeof params.createdTo === `string` ? params.createdTo.slice(0, 16) : ``}
            />
            <label className="field">
              <span>Include deleted</span>
              <input type="checkbox" name="includeDeleted" value="true" defaultChecked={includeDeleted} />
            </label>
            <button className="secondaryButton" type="submit">
              Apply filters
            </button>
          </form>
        </section>

        {canManage ? (
          <form action={bulkTagDocumentsAction} className="formStack">
            <section className="panel">
              <div className="pageHeader">
                <div>
                  <h2>Bulk tag</h2>
                  <p className="muted">Exact allowed bulk action only: add selected tags to selected documents.</p>
                </div>
              </div>
              <div className="pillRow">
                {(tags?.items ?? []).map((tag) => (
                  <label className="pill" key={tag.id}>
                    <input type="checkbox" name="tagIds" value={tag.id} disabled={tag.reserved} />
                    {tag.name}
                    {tag.reserved ? ` (system-managed)` : ``}
                  </label>
                ))}
              </div>
              <p className="muted">
                Select the documents to include from the explorer table below, then submit this exact
                `document_bulk_tag` action.
              </p>
              <button className="secondaryButton" type="submit">
                Bulk tag selected documents
              </button>
            </section>
            <ExplorerTable canManage documents={documents} />
          </form>
        ) : (
          <ExplorerTable canManage={false} documents={documents} />
        )}
      </>
    </WorkspaceLayout>
  );
}
