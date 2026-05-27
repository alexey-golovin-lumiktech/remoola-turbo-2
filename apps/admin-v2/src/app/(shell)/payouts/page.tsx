import { adminV2PayoutsListQuerySchema } from '@remoola/api-types';

import { ActionGhost } from '../../../components/action-ghost';
import { ContextStat } from '../../../components/context-stat';
import { Panel } from '../../../components/panel';
import { TinyPill } from '../../../components/tiny-pill';
import { buttonRowClass, mutedTextClass, stackClass } from '../../../components/ui-classes';
import { WorkspaceLayout } from '../../../components/workspace-layout';
import {
  bucketItems,
  PayoutBucketViews,
  PayoutHighValueViews,
  renderBucketMapLinks,
  renderHighValueThresholds,
} from '../../../features/payouts/payouts-list-presenters';
import { getPayouts } from '../../../lib/admin-api/payments.server';
import { formatDateTime } from '../../../lib/admin-format';
import { buildPathWithSearch } from '../../../lib/navigation-context';
import { type SearchParamValue, trimmedSearchParam } from '../../../lib/query-contract';

const formatDate = formatDateTime;

export default async function PayoutsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, SearchParamValue>>;
}) {
  const params = await searchParams;
  const query = adminV2PayoutsListQuerySchema.parse({
    cursor: trimmedSearchParam(params?.cursor),
  });
  const cursor = query.cursor ?? ``;
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
    return buildPathWithSearch(`/payouts`, { cursor: nextCursor });
  }

  return (
    <WorkspaceLayout
      workspace="payouts"
      context={
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <ContextStat label="Visible payouts" value={items.length} tone="cyan" />
            <ContextStat label="Live buckets" value={visibleBuckets.length} />
            <ContextStat
              label="High-value"
              value={highValueItems.length}
              tone={highValueItems.length > 0 ? `amber` : `neutral`}
            />
            <ContextStat label="Next page" value={data?.pageInfo.nextCursor ? `Available` : `End`} />
          </div>
          <div className="contextRailSection">
            <h4>Queue shortcuts</h4>
            <div className="contextRailLinks">
              <ActionGhost href="/ledger">Ledger</ActionGhost>
              <ActionGhost href="/payments">Payments</ActionGhost>
            </div>
          </div>
        </>
      }
      contextTitle="Queue context"
      contextDescription="Bucket pressure, high-value overlay, and nearby queues for the current payout window."
    >
      <>
        <Panel
          eyebrow="Payout queue"
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
              <PayoutHighValueViews items={highValueItems} returnTo={currentQueueHref} />
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
                <PayoutBucketViews
                  items={bucket.items}
                  emptyMessage="No payouts in this bucket for the current window."
                  returnTo={currentQueueHref}
                />
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
