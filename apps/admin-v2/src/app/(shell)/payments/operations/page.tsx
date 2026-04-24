import Link from 'next/link';

import { ActionGhost } from '../../../../components/action-ghost';
import { Panel } from '../../../../components/panel';
import { TinyPill } from '../../../../components/tiny-pill';
import { mutedTextClass, stackClass } from '../../../../components/ui-classes';
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
      <Panel
        title="Payment operations queue"
        description="Manual review queue for payment cases that need follow-up before drilldown."
        actions={<ActionGhost href="/payments">Back to payments</ActionGhost>}
      >
        <p className={mutedTextClass}>Generated: {formatDate(queue?.generatedAt)}</p>
      </Panel>

      {buckets.map((bucket) => (
        <Panel
          key={bucket.key}
          title={bucket.label}
          description={bucket.operatorPrompt}
          actions={<TinyPill>{bucket.items.length} items</TinyPill>}
        >
          <div className={stackClass}>
            {bucket.items.length === 0 ? <p className={mutedTextClass}>No follow-up items in this bucket.</p> : null}
            {bucket.items.map((item) => (
              <Panel
                key={item.id}
                className="gap-4"
                actions={
                  <div className={mutedTextClass}>
                    Persisted: {item.persistedStatus} · Effective: {item.effectiveStatus}
                  </div>
                }
              >
                <div>
                  <Link href={`/payments/${item.id}`}>
                    <strong>{item.id}</strong>
                  </Link>
                  <p className={mutedTextClass}>
                    {item.amount} {item.currencyCode} · {item.paymentRail ?? `No rail`}
                  </p>
                </div>
                <p>{item.followUpReason}</p>
                <p className={mutedTextClass}>
                  Payer: {renderConsumerLink(item.payer)} · Requester: {renderConsumerLink(item.requester)}
                </p>
                <p className={mutedTextClass}>
                  Attachments: {item.attachmentsCount} · Invoice-tagged attachments:{` `}
                  {item.invoiceTaggedAttachmentsCount}
                </p>
                <p className={mutedTextClass}>
                  Due: {formatDate(item.dueDate)} · Updated: {formatDate(item.updatedAt)} · Freshness:{` `}
                  {item.dataFreshnessClass}
                </p>
                <p className={mutedTextClass}>
                  Assigned to:{` `}
                  {item.assignedTo ? (
                    <>
                      <span>{item.assignedTo.name ?? item.assignedTo.email ?? item.assignedTo.id}</span>
                      {item.assignedTo.email ? <span className={mutedTextClass}> {item.assignedTo.email}</span> : null}
                    </>
                  ) : (
                    <span className={mutedTextClass}>—</span>
                  )}
                </p>
              </Panel>
            ))}
          </div>
        </Panel>
      ))}
    </>
  );
}
