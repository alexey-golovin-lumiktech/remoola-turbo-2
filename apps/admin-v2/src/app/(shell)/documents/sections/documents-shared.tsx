import Link from 'next/link';

import { type getDocuments } from '../../../../lib/admin-api/documents.server';
import { formatBytes } from '../../../../lib/admin-format';

type DocumentItem = NonNullable<NonNullable<Awaited<ReturnType<typeof getDocuments>>>>[`items`][number];

export function renderDocumentSelection(document: DocumentItem) {
  return <input type="checkbox" name="resourceVersion" value={`${document.id}:${document.version}`} />;
}

export function renderDocumentOwners(document: DocumentItem) {
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

export function renderDocumentAssignee(document: DocumentItem) {
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

export function renderDocumentAssigneeSummary(document: DocumentItem): string {
  if (!document.assignedTo) {
    return `—`;
  }

  return document.assignedTo.name ?? document.assignedTo.email ?? document.assignedTo.id;
}

export function renderDocumentTagBadges(document: DocumentItem) {
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

export function renderDocumentTagSummary(document: DocumentItem): string {
  if (document.tags.length === 0) {
    return `No tags`;
  }

  return document.tags.join(`, `);
}

export function renderDocumentPaymentLinks(document: DocumentItem) {
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

export function renderDocumentPaymentSummary(document: DocumentItem): string {
  if (document.linkedPaymentRequestIds.length === 0) {
    return `No payment linkage.`;
  }

  return document.linkedPaymentRequestIds.join(`, `);
}

export function renderDocumentAccessDetails(document: DocumentItem) {
  return (
    <div className="formStack">
      <span className="pill">{document.access}</span>
      <span className="pill">{document.mimeType ?? `Unknown MIME`}</span>
      <span className="muted">Size: {formatBytes(document.size)}</span>
    </div>
  );
}
