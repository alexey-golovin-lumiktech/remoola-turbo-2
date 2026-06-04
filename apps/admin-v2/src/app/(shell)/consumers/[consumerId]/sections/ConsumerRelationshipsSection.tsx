import Link from 'next/link';

import { formatDateTime, EMPTY_VALUE } from '../../../../../lib/admin-format';
import { type ConsumerPageData } from '../page.loader';
import { nestedCardClass } from '../preview-helpers';

export function ConsumerRelationshipsSection({
  consumer,
  contracts,
}: {
  consumer: ConsumerPageData[`consumer`];
  contracts: ConsumerPageData[`contracts`];
}) {
  return (
    <section className="detailGrid">
      <article className="panel">
        <h2>Contract relationships</h2>
        <div className="formStack">
          {(contracts?.items ?? []).length === 0 ? <p className="muted">No contract relationships found.</p> : null}
          {(contracts?.items ?? []).map((contract) => (
            <div key={contract.id} className={nestedCardClass}>
              <strong>{contract.name || contract.email}</strong>
              <p className="muted">{contract.email}</p>
              <p className="muted">Last status: {contract.lastStatus ?? EMPTY_VALUE}</p>
              <p className="muted">Payments: {contract.paymentsCount}</p>
              <p className="muted">Documents: {contract.docs}</p>
            </div>
          ))}
        </div>
      </article>
      <article className="panel">
        <h2>Recent payment requests</h2>
        <div className="formStack">
          {consumer.recentPaymentRequests.length === 0 ? <p className="muted">No payment requests.</p> : null}
          {consumer.recentPaymentRequests.map((paymentRequest) => (
            <div key={paymentRequest.id} className={nestedCardClass}>
              <strong>
                <Link href={`/payments/${paymentRequest.id}`}>
                  {paymentRequest.amount} {paymentRequest.currencyCode}
                </Link>
              </strong>
              <p className="muted">{paymentRequest.status}</p>
              <p className="muted">Rail: {paymentRequest.paymentRail ?? EMPTY_VALUE}</p>
              <p className="muted">Created: {formatDateTime(paymentRequest.createdAt)}</p>
            </div>
          ))}
        </div>
      </article>
      <article className="panel">
        <div className="pageHeader">
          <div>
            <h2>Payment methods</h2>
            <p className="muted">Direct link into the payment-method investigation workspace.</p>
          </div>
          <Link className="secondaryButton" href={`/payment-methods?consumerId=${consumer.id}&includeDeleted=true`}>
            Open payment methods
          </Link>
        </div>
        <div className="formStack">
          {consumer.paymentMethods.length === 0 ? <p className="muted">No payment methods.</p> : null}
          {consumer.paymentMethods.map((paymentMethod) => (
            <div key={String(paymentMethod.id)} className={nestedCardClass}>
              <strong>
                <Link href={`/payment-methods/${paymentMethod.id}`}>
                  {String(paymentMethod.type) === `CREDIT_CARD`
                    ? `${String(paymentMethod.brand ?? `Card`)} •••• ${String(paymentMethod.last4 ?? `----`)}`
                    : `${String(paymentMethod.type)} •••• ${String(paymentMethod.last4 ?? `----`)}`}
                </Link>
              </strong>
              <p className="muted">Default: {paymentMethod.defaultSelected ? `Yes` : `No`}</p>
              <p className="muted">Status: {paymentMethod.status}</p>
              {paymentMethod.disabledAt ? (
                <p className="muted">Disabled: {formatDateTime(paymentMethod.disabledAt)}</p>
              ) : null}
              <p className="muted">Created: {formatDateTime(paymentMethod.createdAt)}</p>
              <p className="muted">Updated: {formatDateTime(paymentMethod.updatedAt)}</p>
            </div>
          ))}
        </div>
      </article>
      <article className="panel">
        <h2>Documents</h2>
        <div className="formStack">
          {consumer.consumerResources.map((resource) => (
            <div key={resource.id} className={nestedCardClass}>
              <strong>{resource.resource.originalName}</strong>
              <p className="muted">{resource.resource.mimetype}</p>
              <p className="muted">
                {resource.resource.size} bytes · {formatDateTime(resource.resource.createdAt)}
              </p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
