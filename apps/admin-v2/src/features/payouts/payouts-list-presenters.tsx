import Link from 'next/link';
import { type ReactElement, type ReactNode } from 'react';

import { DenseTable } from '../../components/dense-table';
import { MobileQueueCard } from '../../components/mobile-queue-card';
import { TabletRow } from '../../components/tablet-row';
import { TinyPill } from '../../components/tiny-pill';
import { emptyPanelClass, mutedTextClass } from '../../components/ui-classes';
import { type PayoutsListResponse } from '../../lib/admin-api/types';
import { formatDateTime } from '../../lib/admin-format';
import { withReturnTo } from '../../lib/navigation-context';

const formatDate = formatDateTime;

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

export function renderHighValueThresholds(data: PayoutsListResponse | null) {
  if (!data || data.highValuePolicy.configuredThresholds.length === 0) {
    return `No per-currency thresholds configured`;
  }

  return data.highValuePolicy.configuredThresholds
    .map((threshold) => `${threshold.currencyCode} >= ${threshold.amount}`)
    .join(` · `);
}

export function renderBucketMapLinks(
  buckets: Array<{ key: string; label: string; items: Array<{ id: string }> }>,
  idPrefix: string,
): ReactElement {
  return (
    <div className="flex flex-wrap gap-2">
      {buckets.map((bucket) => (
        <a
          key={bucket.key}
          href={`#${idPrefix}-${bucket.key}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill border border-white/10 bg-white/3 px-3 py-2 text-sm text-white/72 transition hover:border-white/20 hover:bg-white/5 hover:text-white/90"
        >
          <span>{bucket.label}</span>
          <TinyPill>{bucket.items.length}</TinyPill>
        </a>
      ))}
    </div>
  );
}

export function bucketItems(items: PayoutItem[]) {
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

export function PayoutHighValueViews({ items, returnTo }: { items: PayoutItem[]; returnTo: string }) {
  return (
    <>
      {renderHighValueMobileCards(items, returnTo)}
      {renderHighValueTabletRows(items, returnTo)}
      {renderHighValueDesktopTable(items, returnTo)}
    </>
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

export function PayoutBucketViews({
  items,
  emptyMessage,
  returnTo,
}: {
  items: PayoutItem[];
  emptyMessage: string;
  returnTo: string;
}) {
  return (
    <>
      {renderBucketMobileCards(items, emptyMessage, returnTo)}
      {renderBucketTabletRows(items, emptyMessage, returnTo)}
      {renderBucketDesktopTable(items, emptyMessage, returnTo)}
    </>
  );
}
