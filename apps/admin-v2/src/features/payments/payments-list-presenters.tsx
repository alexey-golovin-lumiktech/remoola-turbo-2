import Link from 'next/link';

import { DenseTable } from '../../components/dense-table';
import { MobileQueueCard, MobileQueueSection } from '../../components/mobile-queue-card';
import { StatusPill } from '../../components/status-pill';
import { TabletRow } from '../../components/tablet-row';
import { TinyPill } from '../../components/tiny-pill';
import { emptyPanelClass, mutedTextClass, subtleTextClass } from '../../components/ui-classes';
import { type getPayments } from '../../lib/admin-api/payments.server';
import { formatDate, EMPTY_VALUE } from '../../lib/admin-format';
import { withReturnTo } from '../../lib/navigation-context';

type PaymentItem = NonNullable<Awaited<ReturnType<typeof getPayments>>>[`items`][number];

function renderConsumerLabel(consumer: PaymentItem[`payer`] | PaymentItem[`requester`]): string {
  return consumer.email ?? consumer.id ?? `Unknown consumer`;
}

function renderConsumerLink(consumer: PaymentItem[`payer`] | PaymentItem[`requester`], returnTo: string) {
  if (consumer.id) {
    return <Link href={withReturnTo(`/consumers/${consumer.id}`, returnTo)}>{consumer.email ?? consumer.id}</Link>;
  }

  return consumer.email ?? EMPTY_VALUE;
}

function PaymentParticipants({ item, returnTo }: { item: PaymentItem; returnTo: string }) {
  return (
    <>
      <div>Payer: {renderConsumerLink(item.payer, returnTo)}</div>
      <div>Requester: {renderConsumerLink(item.requester, returnTo)}</div>
    </>
  );
}

function PaymentParticipantsSummary({ item, returnTo }: { item: PaymentItem; returnTo: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-sm text-white/90">Payer: {renderConsumerLink(item.payer, returnTo)}</div>
      <div className="truncate text-sm text-white/72">Requester: {renderConsumerLink(item.requester, returnTo)}</div>
    </div>
  );
}

function PaymentQueueHeading({ item }: { item: PaymentItem }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-sm text-white/95">{renderConsumerLabel(item.payer)}</div>
      <div className="truncate text-xs text-white/56">Requester: {renderConsumerLabel(item.requester)}</div>
    </div>
  );
}

function PaymentAssignedTo({ item }: { item: PaymentItem }) {
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

function shouldShowPersistedStatus(item: PaymentItem): boolean {
  return item.persistedStatus !== item.effectiveStatus;
}

function shouldShowFreshnessLabel(item: PaymentItem): boolean {
  return item.staleWarning || item.dataFreshnessClass !== `exact`;
}

export function PaymentsMobileCards({ items, returnTo }: { items: PaymentItem[]; returnTo: string }) {
  if (items.length === 0) {
    return (
      <div className="readSurface md:hidden" data-view="mobile">
        <div className={emptyPanelClass}>No payment requests found for the current filters.</div>
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
            href={withReturnTo(`/payments/${item.id}`, returnTo)}
            eyebrow="Payment request"
            title={<PaymentQueueHeading item={item} />}
            subtitle={item.id}
            trailing={
              <>
                {item.amount} {item.currencyCode}
              </>
            }
            badges={
              <>
                <StatusPill status={item.effectiveStatus} />
                {item.paymentRail ? <TinyPill>{item.paymentRail}</TinyPill> : null}
              </>
            }
          >
            <MobileQueueSection title="Queue summary">
              <div className={mutedTextClass}>
                Assigned: <PaymentAssignedTo item={item} />
              </div>
              {shouldShowPersistedStatus(item) ? (
                <div className={mutedTextClass}>Persisted: {item.persistedStatus}</div>
              ) : null}
              <div className={mutedTextClass}>
                {item.staleWarning ? `Persisted status is stale` : `Exact enough for list`}
              </div>
              <div className={mutedTextClass}>Due: {formatDate(item.dueDate)}</div>
            </MobileQueueSection>
            <MobileQueueSection title="Participants" compact>
              <PaymentParticipants item={item} returnTo={returnTo} />
            </MobileQueueSection>
            <MobileQueueSection title="Freshness" compact>
              <div className={mutedTextClass}>Attachments: {item.attachmentsCount}</div>
              <div className={mutedTextClass}>Updated: {formatDate(item.updatedAt)}</div>
            </MobileQueueSection>
          </MobileQueueCard>
        ))}
      </div>
    </div>
  );
}

export function PaymentsTabletRows({ items, returnTo }: { items: PaymentItem[]; returnTo: string }) {
  if (items.length === 0) {
    return (
      <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
        <div className={emptyPanelClass}>No payment requests found for the current filters.</div>
      </div>
    );
  }

  return (
    <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
      <div className="condensedList">
        {items.map((item) => (
          <TabletRow
            key={item.id}
            eyebrow="Payment request"
            primary={
              <>
                <Link href={withReturnTo(`/payments/${item.id}`, returnTo)}>
                  <strong>{renderConsumerLabel(item.payer)}</strong>
                </Link>
                <div className={mutedTextClass}>Requester: {renderConsumerLabel(item.requester)}</div>
                <div className={subtleTextClass}>{item.id}</div>
              </>
            }
            badges={
              <>
                <StatusPill status={item.effectiveStatus} />
                <TinyPill tone="cyan">
                  {item.amount} {item.currencyCode}
                </TinyPill>
                {item.paymentRail ? <TinyPill>{item.paymentRail}</TinyPill> : null}
              </>
            }
            cells={[
              <PaymentParticipantsSummary item={item} key="participants" returnTo={returnTo} />,
              <div key="status">
                {shouldShowPersistedStatus(item) ? (
                  <div className={mutedTextClass}>Persisted: {item.persistedStatus}</div>
                ) : null}
                {item.staleWarning ? <div className={mutedTextClass}>Persisted status is stale</div> : null}
              </div>,
              <div key="amount">
                <div className={mutedTextClass}>Due: {formatDate(item.dueDate)}</div>
                <div className={mutedTextClass}>Rail: {item.paymentRail ?? `No rail`}</div>
              </div>,
              <div key="timing-assigned">
                <div className={mutedTextClass}>Updated: {formatDate(item.updatedAt)}</div>
                {item.assignedTo ? (
                  <div className={mutedTextClass}>
                    Assigned: <PaymentAssignedTo item={item} />
                  </div>
                ) : null}
                {item.attachmentsCount > 0 ? (
                  <div className={mutedTextClass}>Attachments: {item.attachmentsCount}</div>
                ) : null}
              </div>,
            ]}
          />
        ))}
      </div>
    </div>
  );
}

export function PaymentsDesktopTable({ items, returnTo }: { items: PaymentItem[]; returnTo: string }) {
  return (
    <div className="readSurface hidden xl:block" data-view="desktop">
      <DenseTable
        headers={[`Request`, `Participants`, `Status / follow-up`, `Amount / timing`]}
        emptyMessage="No payment requests found for the current filters."
      >
        {items.length === 0
          ? null
          : items.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className={subtleTextClass}>Payment request</div>
                  <div className="mb-1 text-sm text-white/90">Payer: {renderConsumerLabel(item.payer)}</div>
                  <div className={mutedTextClass}>Requester: {renderConsumerLabel(item.requester)}</div>
                  <Link href={withReturnTo(`/payments/${item.id}`, returnTo)} className="block">
                    <strong className="block text-white">{item.id}</strong>
                  </Link>
                  <div className={mutedTextClass}>{item.paymentRail ?? `No rail`}</div>
                  {item.attachmentsCount > 0 ? (
                    <div className={subtleTextClass}>Attachments: {item.attachmentsCount}</div>
                  ) : null}
                </td>
                <td>
                  <PaymentParticipantsSummary item={item} returnTo={returnTo} />
                </td>
                <td>
                  <div>
                    <StatusPill status={item.effectiveStatus} />
                  </div>
                  {shouldShowPersistedStatus(item) ? (
                    <div className={mutedTextClass}>Persisted: {item.persistedStatus}</div>
                  ) : null}
                  {item.assignedTo ? (
                    <div className={mutedTextClass}>
                      Assigned: <PaymentAssignedTo item={item} />
                    </div>
                  ) : null}
                  {shouldShowFreshnessLabel(item) ? (
                    <div className={mutedTextClass}>
                      {item.staleWarning ? `Persisted status is stale` : `Freshness: ${item.dataFreshnessClass}`}
                    </div>
                  ) : null}
                </td>
                <td>
                  <div className="font-semibold text-white/92">
                    {item.amount} {item.currencyCode}
                  </div>
                  <div className={mutedTextClass}>Due: {formatDate(item.dueDate)}</div>
                  <div className={mutedTextClass}>Updated: {formatDate(item.updatedAt)}</div>
                  {!item.assignedTo ? <div className={subtleTextClass}>Unassigned</div> : null}
                  {!shouldShowFreshnessLabel(item) ? (
                    <div className={subtleTextClass}>Freshness: {item.dataFreshnessClass}</div>
                  ) : null}
                </td>
              </tr>
            ))}
      </DenseTable>
    </div>
  );
}
