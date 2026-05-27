import Link from 'next/link';

import { DenseTable } from '../../components/dense-table';
import { MobileQueueCard } from '../../components/mobile-queue-card';
import { StatusPill } from '../../components/status-pill';
import { TabletRow } from '../../components/tablet-row';
import { type getConsumers } from '../../lib/admin-api/consumers.server';
import { formatDateTime } from '../../lib/admin-format';

const formatDate = formatDateTime;

type ConsumerItem = NonNullable<Awaited<ReturnType<typeof getConsumers>>>[`items`][number];

function renderConsumerLabel(consumer: ConsumerItem) {
  return consumer.displayName ?? consumer.email ?? consumer.id;
}

function renderConsumerFlags(consumer: ConsumerItem) {
  if (consumer.adminFlags.length === 0) {
    return <span className="muted">No active flags</span>;
  }

  return (
    <div className="pillRow">
      {consumer.adminFlags.map((flag) => (
        <span key={flag.id} className="pill">
          {flag.flag}
        </span>
      ))}
    </div>
  );
}

function renderConsumerFlagsSummary(consumer: ConsumerItem): string {
  if (consumer.adminFlags.length === 0) {
    return `No active flags`;
  }

  return consumer.adminFlags.map((flag) => flag.flag).join(`, `);
}

export function ConsumersMobileCards({ items }: { items: ConsumerItem[] }) {
  if (items.length === 0) {
    return (
      <div className="readSurface md:hidden" data-view="mobile">
        <div className="panel muted">No consumers matched the current filters.</div>
      </div>
    );
  }

  return (
    <div className="readSurface md:hidden" data-view="mobile">
      <div className="queueCards">
        {items.map((consumer) => (
          <MobileQueueCard
            key={consumer.id}
            id={consumer.id}
            href={`/consumers/${consumer.id}`}
            eyebrow="Consumer case"
            title={renderConsumerLabel(consumer)}
            subtitle={consumer.email ?? `No email`}
            trailing={<StatusPill status={consumer.verificationStatus} />}
            badges={
              <>
                <span className="pill">{consumer.accountType}</span>
                {consumer.contractorKind ? <span className="pill">{consumer.contractorKind}</span> : null}
              </>
            }
          >
            <div className="muted mono">{consumer.id}</div>
            <div className="muted">{consumer.deletedAt ? `Deleted` : `Active`}</div>
            <div className="muted">Stripe identity: {consumer.stripeIdentityStatus ?? `No Stripe state`}</div>
            <div className="muted">Flags: {renderConsumerFlagsSummary(consumer)}</div>
            <div className="muted">Notes: {consumer._count.adminNotes}</div>
            <div className="muted">Updated: {formatDate(consumer.updatedAt)}</div>
          </MobileQueueCard>
        ))}
      </div>
    </div>
  );
}

export function ConsumersTabletRows({ items }: { items: ConsumerItem[] }) {
  if (items.length === 0) {
    return (
      <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
        <div className="panel muted">No consumers matched the current filters.</div>
      </div>
    );
  }

  return (
    <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
      <div className="condensedList">
        {items.map((consumer) => (
          <TabletRow
            key={consumer.id}
            eyebrow="Consumer case"
            primary={
              <>
                <Link href={`/consumers/${consumer.id}`}>
                  <strong>{renderConsumerLabel(consumer)}</strong>
                </Link>
                <div className="muted">{consumer.email ?? `No email`}</div>
                <div className="muted mono">{consumer.id}</div>
              </>
            }
            badges={
              <>
                <StatusPill status={consumer.verificationStatus} />
                <span className="pill">{consumer.accountType}</span>
                {consumer.contractorKind ? <span className="pill">{consumer.contractorKind}</span> : null}
              </>
            }
            cells={[
              <div key="type">
                <div className="muted">{consumer.deletedAt ? `Deleted` : `Active`}</div>
              </div>,
              <div key="verification">
                <div className="muted">{consumer.stripeIdentityStatus ?? `No Stripe state`}</div>
              </div>,
              <div key="flags" className="muted">
                {renderConsumerFlagsSummary(consumer)}
              </div>,
              <div key="notes-updated">
                <div>{consumer._count.adminNotes} notes</div>
                <div className="muted">{formatDate(consumer.updatedAt)}</div>
              </div>,
            ]}
          />
        ))}
      </div>
    </div>
  );
}

export function ConsumersDesktopTable({ items }: { items: ConsumerItem[] }) {
  return (
    <div className="readSurface hidden xl:block" data-view="desktop">
      <DenseTable
        headers={[`Consumer`, `Type`, `Verification`, `Flags`, `Notes`, `Updated`]}
        emptyMessage="No consumers matched the current filters."
      >
        {items.length === 0
          ? null
          : items.map((consumer) => (
              <tr key={consumer.id}>
                <td>
                  <Link href={`/consumers/${consumer.id}`}>
                    <strong>{renderConsumerLabel(consumer)}</strong>
                  </Link>
                  <div className="muted">{consumer.email ?? `No email`}</div>
                  <div className="muted mono">{consumer.id}</div>
                </td>
                <td>
                  <div>{consumer.accountType}</div>
                  <div className="muted">{consumer.contractorKind ?? `-`}</div>
                  <div className="muted">{consumer.deletedAt ? `Deleted` : `Active`}</div>
                </td>
                <td>
                  <div>
                    <StatusPill status={consumer.verificationStatus} />
                  </div>
                  <div className="muted">{consumer.stripeIdentityStatus ?? `No Stripe state`}</div>
                </td>
                <td>{renderConsumerFlags(consumer)}</td>
                <td>{consumer._count.adminNotes}</td>
                <td>{formatDate(consumer.updatedAt)}</td>
              </tr>
            ))}
      </DenseTable>
    </div>
  );
}
