import Link from 'next/link';

import { nestedPanelClass } from '../../../../../components/ui-classes';
import { type PaymentMethodCasePageData } from '../page.loader';
import { formatDate, renderMethodLabel } from '../payment-method-shared';

export function PaymentMethodAuditSection({
  paymentMethod,
}: {
  paymentMethod: PaymentMethodCasePageData[`paymentMethod`];
}) {
  return (
    <>
      {paymentMethod.duplicateEscalation ? (
        <section className="panel">
          <div className="pageHeader">
            <div>
              <h2>Duplicate escalation record</h2>
              <p className="muted">Durable schema-backed record for the fingerprint escalation action.</p>
            </div>
          </div>
          <div className="formStack">
            <p className="muted">Fingerprint: {paymentMethod.duplicateEscalation.fingerprint}</p>
            <p className="muted">Duplicate count snapshot: {paymentMethod.duplicateEscalation.duplicateCount}</p>
            <p className="muted">
              Escalated by:{` `}
              {paymentMethod.duplicateEscalation.escalatedBy.email ?? paymentMethod.duplicateEscalation.escalatedBy.id}
            </p>
            <p className="muted">Created: {formatDate(paymentMethod.duplicateEscalation.createdAt)}</p>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="pageHeader">
          <div>
            <h2>Fingerprint duplicates</h2>
            <p className="muted">
              This view is shown only when the current method has a schema-backed fingerprint. No usage semantics are
              inferred here.
            </p>
          </div>
        </div>
        <div className="formStack">
          {paymentMethod.fingerprintDuplicates.length === 0 ? (
            <p className="muted">No other payment methods share this fingerprint.</p>
          ) : null}
          {paymentMethod.fingerprintDuplicates.map((duplicate) => (
            <div className={nestedPanelClass} key={duplicate.id}>
              <strong>{renderMethodLabel(duplicate)}</strong>
              <p className="muted">{duplicate.consumer.email ?? duplicate.consumer.id}</p>
              <p className="muted mono">{duplicate.id}</p>
              <p className="muted">Default selected: {duplicate.defaultSelected ? `Yes` : `No`}</p>
              <p className="muted">Deleted: {formatDate(duplicate.deletedAt)}</p>
              <p className="muted">Created: {formatDate(duplicate.createdAt)}</p>
              <div className="actionsRow">
                <Link className="secondaryButton" href={`/payment-methods/${duplicate.id}`}>
                  Open method
                </Link>
                <Link className="secondaryButton" href={`/consumers/${duplicate.consumer.id}`}>
                  Open consumer
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
