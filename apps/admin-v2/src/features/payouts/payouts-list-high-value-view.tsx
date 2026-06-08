import { type ReactElement } from 'react';

import {
  type PayoutItem,
  renderAssignedTo,
  renderDestination,
  renderPayoutConsumer,
  renderPayoutPrimary,
} from './payouts-list-shared';
import { DenseTable } from '../../components/dense-table';
import { MobileQueueCard } from '../../components/mobile-queue-card';
import { RenderQueueView } from '../../components/queue-views/render-queue-view';
import { TabletRow } from '../../components/tablet-row';
import { TinyPill } from '../../components/tiny-pill';
import { emptyPanelClass, mutedTextClass } from '../../components/ui-classes';
import { EMPTY_VALUE } from '../../lib/admin-format';
import { withReturnTo } from '../../lib/navigation-context';

function renderHighValueBadges(item: PayoutItem): ReactElement {
  return (
    <div className="pillRow">
      <TinyPill>high-value</TinyPill>
      <TinyPill>{item.derivedStatus}</TinyPill>
      {item.hasActiveEscalation ? <TinyPill>escalated</TinyPill> : null}
    </div>
  );
}

const HIGH_VALUE_EMPTY_MESSAGE = `No payouts qualify for the high-value bucket in the current window.`;

function renderHighValueMobileItem(item: PayoutItem, returnTo: string): ReactElement {
  return (
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
        Threshold: {item.highValue.thresholdCurrency} &gt;= {item.highValue.thresholdAmount ?? EMPTY_VALUE}
      </div>
      <div className={mutedTextClass}>Destination: {renderDestination(item)}</div>
      <div className={mutedTextClass}>{renderPayoutConsumer(item, false, returnTo)}</div>
      <div className={mutedTextClass}>Assigned to: {renderAssignedTo(item)}</div>
    </MobileQueueCard>
  );
}

function renderHighValueTabletItem(item: PayoutItem, returnTo: string): ReactElement {
  return (
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
            Threshold: {item.highValue.thresholdCurrency} &gt;= {item.highValue.thresholdAmount ?? EMPTY_VALUE}
          </div>
        </div>,
        <div key="assigned" className={mutedTextClass}>
          Assigned: {renderAssignedTo(item)}
        </div>,
      ]}
    />
  );
}

function renderHighValueDesktopContent(items: readonly PayoutItem[], returnTo: string): ReactElement {
  return (
    <DenseTable
      headers={[`Payout`, `Consumer`, `Destination`, `Status`, `Threshold`, `Assigned`]}
      emptyMessage={HIGH_VALUE_EMPTY_MESSAGE}
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
                {item.highValue.thresholdCurrency} &gt;= {item.highValue.thresholdAmount ?? EMPTY_VALUE}
              </td>
              <td>{renderAssignedTo(item)}</td>
            </tr>
          ))}
    </DenseTable>
  );
}

export function PayoutHighValueListView({ items, returnTo }: { items: PayoutItem[]; returnTo: string }) {
  return (
    <RenderQueueView<PayoutItem>
      items={items}
      emptyMessage={HIGH_VALUE_EMPTY_MESSAGE}
      emptyClassName={emptyPanelClass}
      renderMobileItem={(item) => renderHighValueMobileItem(item, returnTo)}
      renderTabletItem={(item) => renderHighValueTabletItem(item, returnTo)}
      renderDesktopContent={(rows) => renderHighValueDesktopContent(rows, returnTo)}
    />
  );
}
