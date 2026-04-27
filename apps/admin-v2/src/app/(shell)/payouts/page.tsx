import Link from 'next/link';
import { type ReactElement, type ReactNode } from 'react';

import { ActionGhost } from '../../../components/action-ghost';
import { DenseTable } from '../../../components/dense-table';
import { MobileQueueCard } from '../../../components/mobile-queue-card';
import { Panel } from '../../../components/panel';
import { TabletRow } from '../../../components/tablet-row';
import { TinyPill } from '../../../components/tiny-pill';
import { buttonRowClass, emptyPanelClass, mutedTextClass, stackClass } from '../../../components/ui-classes';
import { WorkspaceLayout } from '../../../components/workspace-layout';
import { getPayouts, type PayoutsListResponse } from '../../../lib/admin-api.server';
import { buildPathWithSearch, withReturnTo } from '../../../lib/navigation-context';

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

type PayoutItem = PayoutsListResponse[`items`][number];

const BUCKET_ORDER = [`failed`, `stuck`, `processing`, `pending`, `completed`, `reversed`] as const;

const BUCKET_COPY: Record<
  (typeof BUCKET_ORDER)[number],
  {
    label: string;
    operatorPrompt: string;
  }
> = {
  failed: {
    label: `Failed payouts`,
    operatorPrompt: `Latest outcome is failed. Review the payout case and escalate from the case page if needed.`,
  },
  stuck: {
    label: `Stuck payouts`,
    operatorPrompt: `Pending-like payouts older than the current threshold. Review the timeline and escalate from the case page if the payout remains stuck.`,
  },
  processing: {
    label: `Processing payouts`,
    operatorPrompt: `In-flight payouts remain read-only. Use the case page for current outcome history and destination context.`,
  },
  pending: {
    label: `Pending payouts`,
    operatorPrompt: `Queue visibility only. These entries are pending without threshold breach in the current slice.`,
  },
  completed: {
    label: `Completed payouts`,
    operatorPrompt: `Completed payouts stay visible for investigation and cross-linking; no action affordances are exposed.`,
  },
  reversed: {
    label: `Reversed payouts`,
    operatorPrompt: `Reversal rows appear in their own payout review bucket instead of sharing the standard payout lifecycle.`,
  },
};

function renderDestination(item: PayoutItem) {
  if (!item.destinationPaymentMethodSummary) {
    return `Unavailable`;
  }

  const suffix = item.destinationPaymentMethodSummary.last4 ?? item.destinationPaymentMethodSummary.bankLast4 ?? `----`;
  const label = item.destinationPaymentMethodSummary.brand
    ? `${item.destinationPaymentMethodSummary.brand} •••• ${suffix}`
    : `${item.destinationPaymentMethodSummary.type} •••• ${suffix}`;
  return label;
}

function renderHighValueThresholds(data: PayoutsListResponse | null) {
  if (!data || data.highValuePolicy.configuredThresholds.length === 0) {
    return `No per-currency thresholds configured`;
  }

  return data.highValuePolicy.configuredThresholds
    .map((threshold) => `${threshold.currencyCode} >= ${threshold.amount}`)
    .join(` · `);
}

function renderBucketMapLinks(
  buckets: Array<{ key: string; label: string; items: Array<{ id: string }> }>,
  idPrefix: string,
): ReactElement {
  return (
    <div className="flex flex-wrap gap-2">
      {buckets.map((bucket) => (
        <a
          key={bucket.key}
          href={`#${idPrefix}-${bucket.key}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/72 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white/90"
        >
          <span>{bucket.label}</span>
          <TinyPill>{bucket.items.length}</TinyPill>
        </a>
      ))}
    </div>
  );
}

function bucketItems(items: PayoutItem[]) {
  return BUCKET_ORDER.map((key) => ({
    key,
    ...BUCKET_COPY[key],
    items: items.filter((item) => item.derivedStatus === key),
  }));
}

function renderAssignedTo(item: PayoutItem): ReactNode {
  if (!item.assignedTo) {
    return <span className={mutedTextClass}>—</span>;
  }

  return (
    <>
      <span>{item.assignedTo.name ?? item.assignedTo.email ?? item.assignedTo.id}</span>
      {item.assignedTo.email ? <span className={mutedTextClass}> {item.assignedTo.email}</span> : null}
    </>
  );
}

function shouldShowPersisted(item: PayoutItem): boolean {
  return item.persistedStatus !== item.effectiveStatus;
}

function shouldShowFreshness(item: PayoutItem): boolean {
  return item.dataFreshnessClass !== `exact`;
}

function renderPayoutPrimary(item: PayoutItem, returnTo: string): ReactElement {
  return (
    <>
      <Link href={withReturnTo(`/payouts/${item.id}`, returnTo)}>
        <strong>{item.id}</strong>
      </Link>
      <div className={mutedTextClass}>
        {item.amount} {item.currencyCode} · {item.type}
      </div>
    </>
  );
}

function renderPayoutConsumer(item: PayoutItem, includePaymentRequestLink: boolean, returnTo: string): ReactElement {
  return (
    <>
      <div>
        Consumer:{` `}
        <Link href={withReturnTo(`/consumers/${item.consumer.id}`, returnTo)}>
          {item.consumer.email ?? item.consumer.id}
        </Link>
      </div>
      {includePaymentRequestLink && item.paymentRequestId ? (
        <div>
          Payment request:{` `}
          <Link href={withReturnTo(`/payments/${item.paymentRequestId}`, returnTo)}>{item.paymentRequestId}</Link>
        </div>
      ) : null}
    </>
  );
}

function renderBucketBadges(item: PayoutItem): ReactElement {
  return (
    <div className="pillRow">
      <TinyPill>{item.derivedStatus}</TinyPill>
      {item.slaBreachDetected ? <TinyPill>threshold breached</TinyPill> : null}
      {item.hasActiveEscalation ? <TinyPill>escalated</TinyPill> : null}
    </div>
  );
}

function renderHighValueBadges(item: PayoutItem): ReactElement {
  return (
    <div className="pillRow">
      <TinyPill>high-value</TinyPill>
      <TinyPill>{item.derivedStatus}</TinyPill>
      {item.hasActiveEscalation ? <TinyPill>escalated</TinyPill> : null}
    </div>
  );
}

function renderHighValueMobileCards(items: PayoutItem[], returnTo: string): ReactElement {
  if (items.length === 0) {
    return (
      <div className="readSurface md:hidden" data-view="mobile">
        <div className={emptyPanelClass}>No payouts qualify for the high-value bucket in the current window.</div>
      </div>
    );
  }

  return (
    <div className="readSurface md:hidden" data-view="mobile">
      <div className="queueCards">
        {items.map((item) => (
          <MobileQueueCard
            key={item.id}
            id={item.id}
            href={withReturnTo(`/payouts/${item.id}`, returnTo)}
            title={item.id}
            subtitle={`${item.amount} ${item.currencyCode} · ${item.type}`}
            trailing={
              item.highValue.thresholdAmount
                ? `${item.highValue.thresholdCurrency} >= ${item.highValue.thresholdAmount}`
                : undefined
            }
          >
            {renderHighValueBadges(item)}
            <div className={mutedTextClass}>
              Threshold: {item.highValue.thresholdCurrency} &gt;= {item.highValue.thresholdAmount ?? `-`}
            </div>
            <div className={mutedTextClass}>Destination: {renderDestination(item)}</div>
            <div className={mutedTextClass}>{renderPayoutConsumer(item, false, returnTo)}</div>
            <div className={mutedTextClass}>Assigned to: {renderAssignedTo(item)}</div>
          </MobileQueueCard>
        ))}
      </div>
    </div>
  );
}

function renderHighValueTabletRows(items: PayoutItem[], returnTo: string): ReactElement {
  if (items.length === 0) {
    return (
      <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
        <div className={emptyPanelClass}>No payouts qualify for the high-value bucket in the current window.</div>
      </div>
    );
  }

  return (
    <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <TabletRow
            key={item.id}
            primary={renderPayoutPrimary(item, returnTo)}
            cells={[
              <div key="consumer">{renderPayoutConsumer(item, false, returnTo)}</div>,
              <div key="destination" className={mutedTextClass}>
                Destination: {renderDestination(item)}
              </div>,
              <div key="status">
                {renderHighValueBadges(item)}
                <div className={mutedTextClass}>
                  Threshold: {item.highValue.thresholdCurrency} &gt;= {item.highValue.thresholdAmount ?? `-`}
                </div>
              </div>,
              <div key="assigned" className={mutedTextClass}>
                Assigned: {renderAssignedTo(item)}
              </div>,
            ]}
          />
        ))}
      </div>
    </div>
  );
}

function renderHighValueDesktopTable(items: PayoutItem[], returnTo: string): ReactElement {
  return (
    <div className="readSurface hidden xl:block" data-view="desktop">
      <DenseTable
        headers={[`Payout`, `Consumer`, `Destination`, `Status`, `Threshold`, `Assigned`]}
        emptyMessage="No payouts qualify for the high-value bucket in the current window."
      >
        {items.length === 0
          ? null
          : items.map((item) => (
              <tr key={item.id}>
                <td>{renderPayoutPrimary(item, returnTo)}</td>
                <td>{renderPayoutConsumer(item, false, returnTo)}</td>
                <td>{renderDestination(item)}</td>
                <td>{renderHighValueBadges(item)}</td>
                <td>
                  {item.highValue.thresholdCurrency} &gt;= {item.highValue.thresholdAmount ?? `-`}
                </td>
                <td>{renderAssignedTo(item)}</td>
              </tr>
            ))}
      </DenseTable>
    </div>
  );
}

function renderBucketMobileCards(items: PayoutItem[], emptyMessage: string, returnTo: string): ReactElement {
  if (items.length === 0) {
    return (
      <div className="readSurface md:hidden" data-view="mobile">
        <div className={emptyPanelClass}>{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className="readSurface md:hidden" data-view="mobile">
      <div className="queueCards">
        {items.map((item) => (
          <MobileQueueCard
            key={item.id}
            id={item.id}
            href={withReturnTo(`/payouts/${item.id}`, returnTo)}
            title={item.id}
            subtitle={`${item.amount} ${item.currencyCode} · ${item.type}`}
            trailing={`${item.outcomeAgeHours.toFixed(1)}h`}
          >
            {renderBucketBadges(item)}
            <div className={mutedTextClass}>{renderPayoutConsumer(item, true, returnTo)}</div>
            <div className={mutedTextClass}>Destination: {renderDestination(item)}</div>
            <div className={mutedTextClass}>
              Outcome age: {item.outcomeAgeHours.toFixed(1)}h · Updated: {formatDate(item.updatedAt)}
            </div>
            {shouldShowPersisted(item) ? <div className={mutedTextClass}>Persisted: {item.persistedStatus}</div> : null}
            {item.destinationLinkageSource ? (
              <div className={mutedTextClass}>Linkage: {item.destinationLinkageSource}</div>
            ) : null}
            {item.externalReference ? (
              <div className={mutedTextClass}>External reference: {item.externalReference}</div>
            ) : null}
            {item.highValue.eligibility === `high-value` && item.highValue.thresholdAmount ? (
              <div className={mutedTextClass}>
                High-value threshold: {item.highValue.thresholdCurrency} &gt;= {item.highValue.thresholdAmount}
              </div>
            ) : null}
            {shouldShowFreshness(item) ? (
              <div className={mutedTextClass}>Freshness: {item.dataFreshnessClass}</div>
            ) : null}
            {item.assignedTo ? <div className={mutedTextClass}>Assigned to: {renderAssignedTo(item)}</div> : null}
          </MobileQueueCard>
        ))}
      </div>
    </div>
  );
}

function renderBucketTabletRows(items: PayoutItem[], emptyMessage: string, returnTo: string): ReactElement {
  if (items.length === 0) {
    return (
      <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
        <div className={emptyPanelClass}>{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <TabletRow
            key={item.id}
            primary={renderPayoutPrimary(item, returnTo)}
            cells={[
              <div key="consumer">{renderPayoutConsumer(item, true, returnTo)}</div>,
              <div key="destination" className={mutedTextClass}>
                Destination: {renderDestination(item)}
                {item.destinationLinkageSource ? <div>Linkage: {item.destinationLinkageSource}</div> : null}
              </div>,
              <div key="status">
                {renderBucketBadges(item)}
                {shouldShowPersisted(item) ? (
                  <div className={mutedTextClass}>Persisted: {item.persistedStatus}</div>
                ) : null}
              </div>,
              <div key="timing" className={mutedTextClass}>
                <div>Outcome age: {item.outcomeAgeHours.toFixed(1)}h</div>
                <div>Updated: {formatDate(item.updatedAt)}</div>
                {shouldShowFreshness(item) ? <div>Freshness: {item.dataFreshnessClass}</div> : null}
                {item.assignedTo ? <div>Assigned: {renderAssignedTo(item)}</div> : null}
              </div>,
            ]}
          />
        ))}
      </div>
    </div>
  );
}

function renderBucketDesktopTable(items: PayoutItem[], emptyMessage: string, returnTo: string): ReactElement {
  return (
    <div className="readSurface hidden xl:block" data-view="desktop">
      <DenseTable
        headers={[`Payout`, `Consumer / links`, `Destination`, `Status`, `Freshness / timing`, `Assigned`]}
        emptyMessage={emptyMessage}
      >
        {items.length === 0
          ? null
          : items.map((item) => (
              <tr key={item.id}>
                <td>{renderPayoutPrimary(item, returnTo)}</td>
                <td>{renderPayoutConsumer(item, true, returnTo)}</td>
                <td>
                  <div>{renderDestination(item)}</div>
                  {item.destinationLinkageSource ? (
                    <div className={mutedTextClass}>Linkage: {item.destinationLinkageSource}</div>
                  ) : null}
                </td>
                <td>
                  {renderBucketBadges(item)}
                  {shouldShowPersisted(item) ? (
                    <div className={mutedTextClass}>Persisted: {item.persistedStatus}</div>
                  ) : null}
                  {item.highValue.eligibility === `high-value` && item.highValue.thresholdAmount ? (
                    <div className={mutedTextClass}>
                      Threshold: {item.highValue.thresholdCurrency} &gt;= {item.highValue.thresholdAmount}
                    </div>
                  ) : null}
                </td>
                <td>
                  <div className={mutedTextClass}>Outcome age: {item.outcomeAgeHours.toFixed(1)}h</div>
                  <div className={mutedTextClass}>Updated: {formatDate(item.updatedAt)}</div>
                  {item.externalReference ? (
                    <div className={mutedTextClass}>External reference: {item.externalReference}</div>
                  ) : null}
                  {shouldShowFreshness(item) ? (
                    <div className={mutedTextClass}>Freshness: {item.dataFreshnessClass}</div>
                  ) : null}
                </td>
                <td>{item.assignedTo ? renderAssignedTo(item) : <span className={mutedTextClass}>—</span>}</td>
              </tr>
            ))}
      </DenseTable>
    </div>
  );
}

export default async function PayoutsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    cursor?: string;
  }>;
}) {
  const params = await searchParams;
  const cursor = params?.cursor?.trim() ?? ``;
  const data = await getPayouts({
    cursor: cursor || undefined,
  });
  const items = data?.items ?? [];
  const currentQueueHref = buildPathWithSearch(`/payouts`, { cursor });
  const buckets = bucketItems(items);
  const visibleBuckets = buckets.filter((bucket) => bucket.items.length > 0);
  const hiddenBuckets = buckets.filter((bucket) => bucket.items.length === 0);
  const highValueItems = items.filter((item) => item.highValue.eligibility === `high-value`);

  function nextHref(nextCursor: string) {
    const query = new URLSearchParams();
    query.set(`cursor`, nextCursor);
    return `/payouts?${query.toString()}`;
  }

  return (
    <WorkspaceLayout workspace="payouts">
      <>
        <Panel
          title="Payouts"
          description={`${items.length} payouts in the current window · ${visibleBuckets.length} live buckets${hiddenBuckets.length ? ` · ${hiddenBuckets.length} empty buckets hidden below` : ``}`}
          actions={
            <div className={buttonRowClass}>
              <ActionGhost href="/ledger">Back to ledger</ActionGhost>
              {data?.pageInfo.nextCursor ? (
                <ActionGhost href={nextHref(data.pageInfo.nextCursor)}>Next</ActionGhost>
              ) : null}
            </div>
          }
          surface="primary"
        >
          <p className={mutedTextClass}>Generated: {formatDate(data?.generatedAt)}</p>
        </Panel>

        <Panel
          title="Queue signals"
          description={data?.posture.wording ?? `No payout queue data available.`}
          surface="meta"
        >
          <div className="grid gap-2 text-sm text-white/72 md:grid-cols-2 xl:grid-cols-4">
            <p>Threshold: {data?.stuckPolicy.thresholdHours ?? 24}h</p>
            <p>Breach condition: {data?.stuckPolicy.breachCondition ?? `-`}</p>
            <p>Escalation target: {data?.stuckPolicy.escalationTarget ?? `-`}</p>
            <p>Automation: {data?.stuckPolicy.automationStatus ?? `-`}</p>
          </div>
        </Panel>

        {visibleBuckets.length > 0 ? (
          <Panel
            title="Bucket map"
            description="Jump to the populated payout sections in the current window and avoid scanning the entire page top-to-bottom."
            surface="meta"
          >
            {renderBucketMapLinks(visibleBuckets, `payout-bucket`)}
          </Panel>
        ) : null}

        {highValueItems.length > 0 ? (
          <Panel
            title="High-value payouts"
            description={`Overlay bucket for the current window · ${data?.highValuePolicy.availability ?? `unconfigured`}`}
            actions={
              <div className="pillRow">
                <TinyPill>{highValueItems.length} items</TinyPill>
              </div>
            }
            surface="support"
          >
            <p className={mutedTextClass}>Configured thresholds: {renderHighValueThresholds(data)}</p>
            <div className={stackClass}>
              {renderHighValueMobileCards(highValueItems, currentQueueHref)}
              {renderHighValueTabletRows(highValueItems, currentQueueHref)}
              {renderHighValueDesktopTable(highValueItems, currentQueueHref)}
            </div>
          </Panel>
        ) : null}

        {visibleBuckets.map((bucket, index) => (
          <section key={bucket.key} id={`payout-bucket-${bucket.key}`} className="scroll-mt-32 xl:scroll-mt-36">
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
              surface="support"
            >
              <div className={stackClass}>
                {renderBucketMobileCards(
                  bucket.items,
                  `No payouts in this bucket for the current window.`,
                  currentQueueHref,
                )}
                {renderBucketTabletRows(
                  bucket.items,
                  `No payouts in this bucket for the current window.`,
                  currentQueueHref,
                )}
                {renderBucketDesktopTable(
                  bucket.items,
                  `No payouts in this bucket for the current window.`,
                  currentQueueHref,
                )}
              </div>
            </Panel>
          </section>
        ))}

        {hiddenBuckets.length > 0 ? (
          <Panel
            title="Hidden empty buckets"
            description="Empty payout sections are collapsed by default to reduce scroll and visual noise."
            surface="meta"
          >
            <div className="pillRow">
              {hiddenBuckets.map((bucket) => (
                <TinyPill key={bucket.key}>{bucket.label}</TinyPill>
              ))}
            </div>
          </Panel>
        ) : null}
      </>
    </WorkspaceLayout>
  );
}
