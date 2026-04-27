import Link from 'next/link';
import { type ReactElement } from 'react';

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

function shouldShowFreshness(item: QueueItem): boolean {
  return item.dataFreshnessClass !== `exact`;
}

function shouldShowPersistedStatus(item: QueueItem): boolean {
  return item.persistedStatus !== item.effectiveStatus;
}

function renderBucketMapLinks(buckets: QueueBucket[]): ReactElement {
  return (
    <div className="flex flex-wrap gap-2">
      {buckets.map((bucket) => (
        <a
          key={bucket.key}
          href={`#payment-ops-bucket-${bucket.key}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/72 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white/90"
        >
          <span>{bucket.label}</span>
          <TinyPill>{bucket.items.length}</TinyPill>
        </a>
      ))}
    </div>
  );
}

export default async function PaymentOperationsQueuePage() {
  const queue = await getPaymentOperationsQueue();
  const buckets = queue?.buckets ?? [];
  const visibleBuckets = buckets.filter((bucket) => bucket.items.length > 0);
  const emptyBuckets = buckets.filter((bucket) => bucket.items.length === 0);

  return (
    <>
      <Panel
        title="Payment operations queue"
        description={`Manual review queue for payment cases that need follow-up before drilldown.${visibleBuckets.length ? ` ${visibleBuckets.length} active bucket${visibleBuckets.length === 1 ? `` : `s`} shown first.` : ``}${emptyBuckets.length ? ` ${emptyBuckets.length} empty bucket${emptyBuckets.length === 1 ? `` : `s`} collapsed below.` : ``}`}
        actions={<ActionGhost href="/payments">Back to payments</ActionGhost>}
      >
        <p className={mutedTextClass}>Generated: {formatDate(queue?.generatedAt)}</p>
      </Panel>

      {visibleBuckets.length > 0 ? (
        <Panel
          title="Bucket map"
          description="Jump directly to the active review bucket instead of scrolling through the entire queue."
          actions={<TinyPill>{visibleBuckets.length} active</TinyPill>}
          surface="meta"
        >
          {renderBucketMapLinks(visibleBuckets)}
        </Panel>
      ) : null}

      {visibleBuckets.map((bucket, index) => (
        <section key={bucket.key} id={`payment-ops-bucket-${bucket.key}`} className="scroll-mt-32 xl:scroll-mt-36">
          <Panel
            title={bucket.label}
            description={bucket.operatorPrompt}
            actions={
              <div className="pillRow">
                <TinyPill>
                  {index + 1} / {visibleBuckets.length}
                </TinyPill>
                <TinyPill>{bucket.items.length} items</TinyPill>
              </div>
            }
          >
            <p className={mutedTextClass}>
              Review the reason first, then drill into the payment case for the full timeline and linked consumer
              context.
            </p>
            <div className={stackClass}>
              {bucket.items.map((item) => (
                <article key={item.id} className="rounded-card border border-white/10 bg-white/[0.02] p-4 shadow-xs">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
                        Payment request
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <TinyPill>
                          {item.amount} {item.currencyCode}
                        </TinyPill>
                        <TinyPill tone="cyan">{item.paymentRail ?? `No rail`}</TinyPill>
                        <TinyPill>{item.effectiveStatus}</TinyPill>
                        {item.assignedTo ? <TinyPill>Assigned</TinyPill> : null}
                      </div>
                      <Link href={`/payments/${item.id}`}>
                        <strong className="block text-base text-white">{item.id}</strong>
                      </Link>
                      <p className="text-sm leading-6 text-white/82">{item.followUpReason}</p>
                    </div>
                    <div className="grid gap-2 text-sm text-white/72 sm:grid-cols-2 xl:max-w-[520px] xl:text-right">
                      <p className={mutedTextClass}>
                        Due: {formatDate(item.dueDate)} · Updated: {formatDate(item.updatedAt)}
                      </p>
                      <p className={mutedTextClass}>
                        Payer: {renderConsumerLink(item.payer)} · Requester: {renderConsumerLink(item.requester)}
                      </p>
                      {shouldShowPersistedStatus(item) ? (
                        <p className={mutedTextClass}>
                          Persisted: {item.persistedStatus} · Effective: {item.effectiveStatus}
                        </p>
                      ) : null}
                      {item.attachmentsCount === 0 || item.invoiceTaggedAttachmentsCount === 0 ? (
                        <p className={mutedTextClass}>
                          Attachments: {item.attachmentsCount} · Invoice-tagged: {item.invoiceTaggedAttachmentsCount}
                        </p>
                      ) : null}
                      {shouldShowFreshness(item) ? (
                        <p className={mutedTextClass}>Freshness: {item.dataFreshnessClass}</p>
                      ) : null}
                      {item.assignedTo ? (
                        <p className={mutedTextClass}>
                          Assigned to: {item.assignedTo.name ?? item.assignedTo.email ?? item.assignedTo.id}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </Panel>
        </section>
      ))}

      {emptyBuckets.length > 0 ? (
        <Panel
          title="Hidden empty buckets"
          description="Empty review sections are collapsed by default to keep the follow-up buckets prominent."
          actions={<TinyPill>{emptyBuckets.length} empty</TinyPill>}
          surface="meta"
        >
          <div className="pillRow">
            {emptyBuckets.map((bucket) => (
              <TinyPill key={bucket.key}>{bucket.label}</TinyPill>
            ))}
          </div>
        </Panel>
      ) : null}
    </>
  );
}
