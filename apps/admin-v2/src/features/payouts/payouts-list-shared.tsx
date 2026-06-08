import Link from 'next/link';
import { type ReactElement, type ReactNode } from 'react';

import { TinyPill } from '../../components/tiny-pill';
import { mutedTextClass } from '../../components/ui-classes';
import { type PayoutsListResponse } from '../../lib/admin-api/types';
import { withReturnTo } from '../../lib/navigation-context';

export type PayoutItem = PayoutsListResponse[`items`][number];

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

export function renderDestination(item: PayoutItem) {
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

export function renderAssignedTo(item: PayoutItem): ReactNode {
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

export function shouldShowPersisted(item: PayoutItem): boolean {
  return item.persistedStatus !== item.effectiveStatus;
}

export function shouldShowFreshness(item: PayoutItem): boolean {
  return item.dataFreshnessClass !== `exact`;
}

export function renderPayoutPrimary(item: PayoutItem, returnTo: string): ReactElement {
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

export function renderPayoutConsumer(
  item: PayoutItem,
  includePaymentRequestLink: boolean,
  returnTo: string,
): ReactElement {
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
