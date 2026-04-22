import Link from 'next/link';

import { getPaymentOperationsQueue, type PaymentOperationsQueueResponse } from '../../../../lib/admin-api.server';

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

type QueueBucket = PaymentOperationsQueueResponse[`buckets`][number];
type QueueItem = QueueBucket[`items`][number];

function renderConsumerLink(consumer: QueueItem[`payer`] | QueueItem[`requester`]) {
  if (consumer.id) {
    return <Link href={`/consumers/${consumer.id}`}>{consumer.email ?? consumer.id}</Link>;
  }

  return consumer.email ?? `-`;
}

export default async function PaymentOperationsQueuePage() {
  const queue = await getPaymentOperationsQueue();
  const buckets = queue?.buckets ?? [];

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>Payment operations queue</h1>
          <p className="muted">
            Non-SLA operator follow-up surface for payment-domain cases that need manual review before drilldown.
          </p>
          <p className="muted">Generated: {formatDate(queue?.generatedAt)}</p>
        </div>
        <div className="actionsRow">
          <Link className="secondaryButton" href="/payments">
            Back to payments
          </Link>
        </div>
      </section>

      {buckets.map((bucket) => (
        <section key={bucket.key} className="panel">
          <div className="pageHeader">
            <div>
              <h2>{bucket.label}</h2>
              <p className="muted">{bucket.operatorPrompt}</p>
            </div>
            <div className="pillRow">
              <span className="pill">{bucket.items.length} items</span>
            </div>
          </div>
          <div className="formStack">
            {bucket.items.length === 0 ? <p className="muted">No follow-up items in this bucket.</p> : null}
            {bucket.items.map((item) => (
              <article className="panel" key={item.id}>
                <div className="pageHeader">
                  <div>
                    <Link href={`/payments/${item.id}`}>
                      <strong>{item.id}</strong>
                    </Link>
                    <p className="muted">
                      {item.amount} {item.currencyCode} · {item.paymentRail ?? `No rail`}
                    </p>
                  </div>
                  <div className="muted">
                    Persisted: {item.persistedStatus} · Effective: {item.effectiveStatus}
                  </div>
                </div>
                <p>{item.followUpReason}</p>
                <p className="muted">
                  Payer: {renderConsumerLink(item.payer)} · Requester: {renderConsumerLink(item.requester)}
                </p>
                <p className="muted">
                  Attachments: {item.attachmentsCount} · Invoice-tagged attachments:{` `}
                  {item.invoiceTaggedAttachmentsCount}
                </p>
                <p className="muted">
                  Due: {formatDate(item.dueDate)} · Updated: {formatDate(item.updatedAt)} · Freshness:{` `}
                  {item.dataFreshnessClass}
                </p>
                <p className="muted">
                  Assigned to:{` `}
                  {item.assignedTo ? (
                    <>
                      <span>{item.assignedTo.name ?? item.assignedTo.email ?? item.assignedTo.id}</span>
                      {item.assignedTo.email ? <span className="muted"> {item.assignedTo.email}</span> : null}
                    </>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
