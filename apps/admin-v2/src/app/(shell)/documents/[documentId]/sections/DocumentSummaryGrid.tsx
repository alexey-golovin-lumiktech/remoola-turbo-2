import Link from 'next/link';

import { formatBytes, formatDate } from '../../../../../lib/admin-format';
import { type DocumentCasePageData } from '../page.loader';

export function DocumentSummaryGrid({ documentCase }: { documentCase: DocumentCasePageData[`documentCase`] }) {
  return (
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
  );
}
