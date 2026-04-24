import Link from 'next/link';
import { type ReactElement, type ReactNode } from 'react';

import { DenseTable } from '../../../components/dense-table';
import { MobileQueueCard } from '../../../components/mobile-queue-card';
import { TabletRow } from '../../../components/tablet-row';
import { WorkspaceLayout } from '../../../components/workspace-layout';
import { getPayouts, type PayoutsListResponse } from '../../../lib/admin-api.server';

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
    operatorPrompt: `Latest outcome is failed. Review payout case, verify linked ledger context and use payout_escalate only from the case page when operator confirmation is justified.`,
  },
  stuck: {
    label: `Stuck payouts`,
    operatorPrompt: `Pending-like payouts older than the active threshold. Review the timeline, confirm destination linkage and use payout_escalate only from the case page if the payout remains stuck.`,
  },
  processing: {
    label: `Processing payouts`,
    operatorPrompt: `In-flight payouts remain read-only. Use the case page for exact outcome history and destination context.`,
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
    operatorPrompt: `Reversal rows are shown as their own payout-focused investigation bucket, not as a fake standalone lifecycle.`,
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

function bucketItems(items: PayoutItem[]) {
  return BUCKET_ORDER.map((key) => ({
    key,
    ...BUCKET_COPY[key],
    items: items.filter((item) => item.derivedStatus === key),
  }));
}

function renderAssignedTo(item: PayoutItem): ReactNode {
  if (!item.assignedTo) {
    return <span className="muted">—</span>;
  }

  return (
    <>
      <span>{item.assignedTo.name ?? item.assignedTo.email ?? item.assignedTo.id}</span>
      {item.assignedTo.email ? <span className="muted"> {item.assignedTo.email}</span> : null}
    </>
  );
}

function renderPayoutPrimary(item: PayoutItem): ReactElement {
  return (
    <>
      <Link href={`/payouts/${item.id}`}>
        <strong>{item.id}</strong>
      </Link>
      <div className="muted">
        {item.amount} {item.currencyCode} · {item.type}
      </div>
    </>
  );
}

function renderPayoutConsumer(item: PayoutItem, includePaymentRequestLink: boolean): ReactElement {
  return (
    <>
      <div>
        Consumer: <Link href={`/consumers/${item.consumer.id}`}>{item.consumer.email ?? item.consumer.id}</Link>
      </div>
      {includePaymentRequestLink && item.paymentRequestId ? (
        <div>
          Payment request: <Link href={`/payments/${item.paymentRequestId}`}>{item.paymentRequestId}</Link>
        </div>
      ) : null}
    </>
  );
}

function renderBucketBadges(item: PayoutItem): ReactElement {
  return (
    <div className="pillRow">
      <span className="pill">{item.derivedStatus}</span>
      {item.slaBreachDetected ? <span className="pill">threshold breached</span> : null}
      {item.hasActiveEscalation ? <span className="pill">escalated</span> : null}
    </div>
  );
}

function renderHighValueBadges(item: PayoutItem): ReactElement {
  return (
    <div className="pillRow">
      <span className="pill">high-value</span>
      <span className="pill">{item.derivedStatus}</span>
      {item.hasActiveEscalation ? <span className="pill">escalated</span> : null}
    </div>
  );
}

function renderHighValueMobileCards(items: PayoutItem[]): ReactElement {
  if (items.length === 0) {
    return (
      <div className="readSurface md:hidden" data-view="mobile">
        <div className="panel muted">No payouts qualify for the high-value bucket in the current window.</div>
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
            href={`/payouts/${item.id}`}
            title={item.id}
            subtitle={`${item.amount} ${item.currencyCode} · ${item.type}`}
            trailing={
              item.highValue.thresholdAmount
                ? `${item.highValue.thresholdCurrency} >= ${item.highValue.thresholdAmount}`
                : undefined
            }
          >
            {renderHighValueBadges(item)}
            <div className="muted">
              Threshold: {item.highValue.thresholdCurrency} &gt;= {item.highValue.thresholdAmount ?? `-`}
            </div>
            <div className="muted">Destination: {renderDestination(item)}</div>
            <div className="muted">{renderPayoutConsumer(item, false)}</div>
            <div className="muted">Assigned to: {renderAssignedTo(item)}</div>
          </MobileQueueCard>
        ))}
      </div>
    </div>
  );
}

function renderHighValueTabletRows(items: PayoutItem[]): ReactElement {
  if (items.length === 0) {
    return (
      <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
        <div className="panel muted">No payouts qualify for the high-value bucket in the current window.</div>
      </div>
    );
  }

  return (
    <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <TabletRow
            key={item.id}
            primary={renderPayoutPrimary(item)}
            cells={[
              <div key="consumer">{renderPayoutConsumer(item, false)}</div>,
              <div key="destination" className="muted">
                Destination: {renderDestination(item)}
              </div>,
              <div key="status">
                {renderHighValueBadges(item)}
                <div className="muted">
                  Threshold: {item.highValue.thresholdCurrency} &gt;= {item.highValue.thresholdAmount ?? `-`}
                </div>
              </div>,
              <div key="assigned" className="muted">
                Assigned: {renderAssignedTo(item)}
              </div>,
            ]}
          />
        ))}
      </div>
    </div>
  );
}

function renderHighValueDesktopTable(items: PayoutItem[]): ReactElement {
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
                <td>{renderPayoutPrimary(item)}</td>
                <td>{renderPayoutConsumer(item, false)}</td>
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

function renderBucketMobileCards(items: PayoutItem[], emptyMessage: string): ReactElement {
  if (items.length === 0) {
    return (
      <div className="readSurface md:hidden" data-view="mobile">
        <div className="panel muted">{emptyMessage}</div>
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
            href={`/payouts/${item.id}`}
            title={item.id}
            subtitle={`${item.amount} ${item.currencyCode} · ${item.type}`}
            trailing={`${item.outcomeAgeHours.toFixed(1)}h`}
          >
            {renderBucketBadges(item)}
            <div className="muted">
              Persisted: {item.persistedStatus} · Effective: {item.effectiveStatus}
            </div>
            <div className="muted">{renderPayoutConsumer(item, true)}</div>
            <div className="muted">
              Destination: {renderDestination(item)} · Linkage: {item.destinationLinkageSource ?? `unavailable`}
            </div>
            <div className="muted">
              External reference: {item.externalReference ?? `-`} · Outcome age: {item.outcomeAgeHours.toFixed(1)}h
            </div>
            <div className="muted">
              High-value: {item.highValue.eligibility}
              {item.highValue.thresholdAmount
                ? ` · ${item.highValue.thresholdCurrency} >= ${item.highValue.thresholdAmount}`
                : ``}
            </div>
            <div className="muted">
              Updated: {formatDate(item.updatedAt)} · Freshness: {item.dataFreshnessClass}
            </div>
            <div className="muted">Assigned to: {renderAssignedTo(item)}</div>
          </MobileQueueCard>
        ))}
      </div>
    </div>
  );
}

function renderBucketTabletRows(items: PayoutItem[], emptyMessage: string): ReactElement {
  if (items.length === 0) {
    return (
      <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
        <div className="panel muted">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <TabletRow
            key={item.id}
            primary={renderPayoutPrimary(item)}
            cells={[
              <div key="consumer">{renderPayoutConsumer(item, true)}</div>,
              <div key="destination" className="muted">
                Destination: {renderDestination(item)}
                <div>Linkage: {item.destinationLinkageSource ?? `unavailable`}</div>
              </div>,
              <div key="status">
                {renderBucketBadges(item)}
                <div className="muted">
                  Persisted: {item.persistedStatus} · Effective: {item.effectiveStatus}
                </div>
              </div>,
              <div key="timing" className="muted">
                <div>Updated: {formatDate(item.updatedAt)}</div>
                <div>Freshness: {item.dataFreshnessClass}</div>
                <div>Assigned: {renderAssignedTo(item)}</div>
              </div>,
            ]}
          />
        ))}
      </div>
    </div>
  );
}

function renderBucketDesktopTable(items: PayoutItem[], emptyMessage: string): ReactElement {
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
                <td>{renderPayoutPrimary(item)}</td>
                <td>{renderPayoutConsumer(item, true)}</td>
                <td>
                  <div>{renderDestination(item)}</div>
                  <div className="muted">Linkage: {item.destinationLinkageSource ?? `unavailable`}</div>
                </td>
                <td>
                  {renderBucketBadges(item)}
                  <div className="muted">
                    Persisted: {item.persistedStatus} · Effective: {item.effectiveStatus}
                  </div>
                  <div className="muted">
                    High-value: {item.highValue.eligibility}
                    {item.highValue.thresholdAmount
                      ? ` · ${item.highValue.thresholdCurrency} >= ${item.highValue.thresholdAmount}`
                      : ``}
                  </div>
                </td>
                <td>
                  <div className="muted">External reference: {item.externalReference ?? `-`}</div>
                  <div className="muted">Outcome age: {item.outcomeAgeHours.toFixed(1)}h</div>
                  <div className="muted">Updated: {formatDate(item.updatedAt)}</div>
                  <div className="muted">Freshness: {item.dataFreshnessClass}</div>
                </td>
                <td>{renderAssignedTo(item)}</td>
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
  const buckets = bucketItems(items);
  const highValueItems = items.filter((item) => item.highValue.eligibility === `high-value`);

  function nextHref(nextCursor: string) {
    const query = new URLSearchParams();
    query.set(`cursor`, nextCursor);
    return `/payouts?${query.toString()}`;
  }

  return (
    <WorkspaceLayout workspace="payouts">
      <>
        <section className="panel pageHeader">
          <div>
            <h1>Payouts</h1>
            <p className="muted">
              Ledger-derived payout queue with one regulated payout action only: `payout_escalate` for failed or stuck
              cases.
            </p>
            <p className="muted">Generated: {formatDate(data?.generatedAt)}</p>
          </div>
          <div className="actionsRow">
            <Link className="secondaryButton" href="/ledger">
              Back to ledger
            </Link>
            {data?.pageInfo.nextCursor ? (
              <Link className="secondaryButton" href={nextHref(data.pageInfo.nextCursor)}>
                Next
              </Link>
            ) : null}
          </div>
        </section>

        <section className="statsGrid">
          <article className="panel">
            <h3>Queue posture</h3>
            <p className="muted">{data?.posture.wording ?? `No payout queue data available.`}</p>
            <p className="muted">Current window: {items.length} payouts</p>
            <p className="muted">Freshness: ledger-derived exact status per row</p>
          </article>
          <article className="panel">
            <h3>Threshold tuple</h3>
            <p className="muted">Threshold: {data?.stuckPolicy.thresholdHours ?? 24}h</p>
            <p className="muted">Breach condition: {data?.stuckPolicy.breachCondition ?? `-`}</p>
            <p className="muted">Escalation target: {data?.stuckPolicy.escalationTarget ?? `-`}</p>
          </article>
          <article className="panel">
            <h3>Operator reaction</h3>
            <p className="muted">{data?.stuckPolicy.expectedOperatorReaction ?? `-`}</p>
            <p className="muted">Automation: {data?.stuckPolicy.automationStatus ?? `-`}</p>
          </article>
        </section>

        <section className="panel">
          <div className="pageHeader">
            <div>
              <h2>High-value payouts</h2>
              <p className="muted">
                Overlay bucket over the current payout window.{` `}
                {data?.highValuePolicy.wording ?? `No high-value policy data.`}
              </p>
              <p className="muted">Configured thresholds: {renderHighValueThresholds(data)}</p>
            </div>
            <div className="pillRow">
              <span className="pill">{highValueItems.length} items</span>
              <span className="pill">{data?.highValuePolicy.availability ?? `unconfigured`}</span>
            </div>
          </div>
          <div className="formStack">
            {renderHighValueMobileCards(highValueItems)}
            {renderHighValueTabletRows(highValueItems)}
            {renderHighValueDesktopTable(highValueItems)}
          </div>
        </section>

        {buckets.map((bucket) => (
          <section className="panel" key={bucket.key}>
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
              {renderBucketMobileCards(bucket.items, `No payouts in this bucket for the current window.`)}
              {renderBucketTabletRows(bucket.items, `No payouts in this bucket for the current window.`)}
              {renderBucketDesktopTable(bucket.items, `No payouts in this bucket for the current window.`)}
            </div>
          </section>
        ))}
      </>
    </WorkspaceLayout>
  );
}
