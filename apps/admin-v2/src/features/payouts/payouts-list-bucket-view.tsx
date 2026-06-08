import { type ReactElement } from 'react';

import {
  type PayoutItem,
  renderAssignedTo,
  renderDestination,
  renderPayoutConsumer,
  renderPayoutPrimary,
  shouldShowFreshness,
  shouldShowPersisted,
} from './payouts-list-shared';
import { DenseTable } from '../../components/dense-table';
import { MobileQueueCard } from '../../components/mobile-queue-card';
import { RenderQueueView } from '../../components/queue-views/render-queue-view';
import { TabletRow } from '../../components/tablet-row';
import { TinyPill } from '../../components/tiny-pill';
import { emptyPanelClass, mutedTextClass } from '../../components/ui-classes';
import { formatDateTime } from '../../lib/admin-format';
import { withReturnTo } from '../../lib/navigation-context';

function renderBucketBadges(item: PayoutItem): ReactElement {
  return (
    <div className="pillRow">
      <TinyPill>{item.derivedStatus}</TinyPill>
      {item.slaBreachDetected ? <TinyPill>threshold breached</TinyPill> : null}
      {item.hasActiveEscalation ? <TinyPill>escalated</TinyPill> : null}
    </div>
  );
}

function renderBucketMobileItem(item: PayoutItem, returnTo: string): ReactElement {
  return (
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
        Outcome age: {item.outcomeAgeHours.toFixed(1)}h · Updated: {formatDateTime(item.updatedAt)}
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
      {shouldShowFreshness(item) ? <div className={mutedTextClass}>Freshness: {item.dataFreshnessClass}</div> : null}
      {item.assignedTo ? <div className={mutedTextClass}>Assigned to: {renderAssignedTo(item)}</div> : null}
    </MobileQueueCard>
  );
}

function renderBucketTabletItem(item: PayoutItem, returnTo: string): ReactElement {
  return (
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
          {shouldShowPersisted(item) ? <div className={mutedTextClass}>Persisted: {item.persistedStatus}</div> : null}
        </div>,
        <div key="timing" className={mutedTextClass}>
          <div>Outcome age: {item.outcomeAgeHours.toFixed(1)}h</div>
          <div>Updated: {formatDateTime(item.updatedAt)}</div>
          {shouldShowFreshness(item) ? <div>Freshness: {item.dataFreshnessClass}</div> : null}
          {item.assignedTo ? <div>Assigned: {renderAssignedTo(item)}</div> : null}
        </div>,
      ]}
    />
  );
}

function renderBucketDesktopContent(
  items: readonly PayoutItem[],
  emptyMessage: string,
  returnTo: string,
): ReactElement {
  return (
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
                <div className={mutedTextClass}>Updated: {formatDateTime(item.updatedAt)}</div>
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
  );
}

export function PayoutBucketListView({
  items,
  emptyMessage,
  returnTo,
}: {
  items: PayoutItem[];
  emptyMessage: string;
  returnTo: string;
}) {
  return (
    <RenderQueueView<PayoutItem>
      items={items}
      emptyMessage={emptyMessage}
      emptyClassName={emptyPanelClass}
      renderMobileItem={(item) => renderBucketMobileItem(item, returnTo)}
      renderTabletItem={(item) => renderBucketTabletItem(item, returnTo)}
      renderDesktopContent={(rows) => renderBucketDesktopContent(rows, emptyMessage, returnTo)}
    />
  );
}
