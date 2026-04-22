import Link from 'next/link';

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
          {highValueItems.length === 0 ? (
            <p className="muted">No payouts qualify for the high-value bucket in the current window.</p>
          ) : null}
          {highValueItems.map((item) => (
            <article className="panel" key={item.id}>
              <div className="pageHeader">
                <div>
                  <Link href={`/payouts/${item.id}`}>
                    <strong>{item.id}</strong>
                  </Link>
                  <p className="muted">
                    {item.amount} {item.currencyCode} · {item.type}
                  </p>
                </div>
                <div className="pillRow">
                  <span className="pill">high-value</span>
                  <span className="pill">{item.derivedStatus}</span>
                  {item.hasActiveEscalation ? <span className="pill">escalated</span> : null}
                </div>
              </div>
              <p className="muted">
                Threshold: {item.highValue.thresholdCurrency} &gt;= {item.highValue.thresholdAmount ?? `-`}
              </p>
              <p className="muted">
                Consumer:{` `}
                <Link href={`/consumers/${item.consumer.id}`}>{item.consumer.email ?? item.consumer.id}</Link>
              </p>
              <p className="muted">Destination: {renderDestination(item)}</p>
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
            {bucket.items.length === 0 ? (
              <p className="muted">No payouts in this bucket for the current window.</p>
            ) : null}
            {bucket.items.map((item) => (
              <article className="panel" key={item.id}>
                <div className="pageHeader">
                  <div>
                    <Link href={`/payouts/${item.id}`}>
                      <strong>{item.id}</strong>
                    </Link>
                    <p className="muted">
                      {item.amount} {item.currencyCode} · {item.type}
                    </p>
                  </div>
                  <div className="pillRow">
                    <span className="pill">{item.derivedStatus}</span>
                    {item.slaBreachDetected ? <span className="pill">threshold breached</span> : null}
                    {item.hasActiveEscalation ? <span className="pill">escalated</span> : null}
                  </div>
                </div>

                <p className="muted">
                  Persisted: {item.persistedStatus} · Effective: {item.effectiveStatus}
                </p>
                <p className="muted">
                  Consumer:{` `}
                  <Link href={`/consumers/${item.consumer.id}`}>{item.consumer.email ?? item.consumer.id}</Link>
                  {item.paymentRequestId ? (
                    <>
                      {` `}· Payment request:{` `}
                      <Link href={`/payments/${item.paymentRequestId}`}>{item.paymentRequestId}</Link>
                    </>
                  ) : null}
                </p>
                <p className="muted">
                  Destination: {renderDestination(item)} · Linkage:{` `}
                  {item.destinationLinkageSource ?? `unavailable`}
                </p>
                <p className="muted">
                  External reference: {item.externalReference ?? `-`} · Outcome age:{` `}
                  {item.outcomeAgeHours.toFixed(1)}h
                </p>
                <p className="muted">
                  High-value: {item.highValue.eligibility}
                  {item.highValue.thresholdAmount
                    ? ` · ${item.highValue.thresholdCurrency} >= ${item.highValue.thresholdAmount}`
                    : ``}
                </p>
                <p className="muted">
                  Updated: {formatDate(item.updatedAt)} · Freshness: {item.dataFreshnessClass}
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
