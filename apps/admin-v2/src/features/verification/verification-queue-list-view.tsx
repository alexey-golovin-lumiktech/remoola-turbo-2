import Link from 'next/link';

import { DenseTable } from '../../components/dense-table';
import { MobileQueueCard, MobileQueueSection } from '../../components/mobile-queue-card';
import { RenderQueueView } from '../../components/queue-views/render-queue-view';
import { StatusPill } from '../../components/status-pill';
import { TabletRow } from '../../components/tablet-row';
import { TinyPill } from '../../components/tiny-pill';
import { emptyPanelClass, monoMutedTextClass, mutedTextClass } from '../../components/ui-classes';
import { type getVerificationQueue } from '../../lib/admin-api/verification.server';
import { EMPTY_VALUE, formatDateTime } from '../../lib/admin-format';
import { withReturnTo } from '../../lib/navigation-context';

type VerificationItem = NonNullable<Awaited<ReturnType<typeof getVerificationQueue>>>[`items`][number];

function renderVerificationAssignee(item: VerificationItem) {
  if (!item.assignedTo) {
    return <span className={mutedTextClass}>—</span>;
  }

  return (
    <>
      <div>{item.assignedTo.name ?? item.assignedTo.email ?? item.assignedTo.id}</div>
      {item.assignedTo.email ? <div className={mutedTextClass}>{item.assignedTo.email}</div> : null}
    </>
  );
}

function renderVerificationAssigneeSummary(item: VerificationItem): string {
  if (!item.assignedTo) {
    return EMPTY_VALUE;
  }

  return item.assignedTo.name ?? item.assignedTo.email ?? item.assignedTo.id;
}

function renderMobileVerification(returnTo: string) {
  return function renderItem(item: VerificationItem) {
    return (
      <MobileQueueCard
        key={item.id}
        id={item.id}
        href={withReturnTo(`/verification/${item.id}`, returnTo)}
        eyebrow="Verification case"
        title={item.email}
        subtitle={item.id}
        trailing={<StatusPill status={item.verificationStatus} />}
        badges={
          <>
            <TinyPill>{item.accountType}</TinyPill>
            <TinyPill>{item.country ?? `No country`}</TinyPill>
          </>
        }
      >
        <MobileQueueSection title="Review summary">
          <div className={mutedTextClass}>Assigned: {renderVerificationAssigneeSummary(item)}</div>
          <div className={mutedTextClass}>
            {item.missingDocuments ? `Missing documents` : `${item.documentsCount} attached`}
          </div>
          <div className={mutedTextClass}>SLA: {item.slaBreached ? `Breached` : `Within SLA`}</div>
        </MobileQueueSection>
        <MobileQueueSection title="Identity" compact>
          <div className={mutedTextClass}>Stripe: {item.stripeIdentityStatus ?? EMPTY_VALUE}</div>
          <div>
            {item.accountType} · {item.country ?? EMPTY_VALUE}
          </div>
        </MobileQueueSection>
        <MobileQueueSection title="Completion blockers" compact>
          <div className={mutedTextClass}>{item.missingProfileData ? `Missing profile data` : `Profile ready`}</div>
          <div className={mutedTextClass}>Updated: {formatDateTime(item.updatedAt)}</div>
        </MobileQueueSection>
      </MobileQueueCard>
    );
  };
}

function renderTabletVerification(returnTo: string) {
  return function renderItem(item: VerificationItem) {
    return (
      <TabletRow
        key={item.id}
        eyebrow="Verification case"
        primary={
          <>
            <Link href={withReturnTo(`/verification/${item.id}`, returnTo)}>
              <strong>{item.email}</strong>
            </Link>
            <div className={monoMutedTextClass}>{item.id}</div>
          </>
        }
        badges={
          <>
            <StatusPill status={item.verificationStatus} />
            <TinyPill>{item.accountType}</TinyPill>
            <TinyPill>{item.country ?? `No country`}</TinyPill>
          </>
        }
        cells={[
          <div key="status">
            <div className={mutedTextClass}>{item.stripeIdentityStatus ?? EMPTY_VALUE}</div>
          </div>,
          <div key="profile">
            <div>{item.accountType}</div>
            <div className={mutedTextClass}>{item.country ?? EMPTY_VALUE}</div>
            <div className={mutedTextClass}>{item.missingProfileData ? `Missing profile data` : `Profile ready`}</div>
          </div>,
          <div key="docs-sla">
            <div>{item.missingDocuments ? `Missing documents` : `${item.documentsCount} attached`}</div>
            <div className={mutedTextClass}>{item.slaBreached ? `Breached` : `Within SLA`}</div>
          </div>,
          <div key="assigned-updated">
            <div>{renderVerificationAssigneeSummary(item)}</div>
            <div className={mutedTextClass}>{formatDateTime(item.updatedAt)}</div>
          </div>,
        ]}
      />
    );
  };
}

function renderDesktopVerifications(returnTo: string) {
  return function renderContent(items: readonly VerificationItem[]) {
    return (
      <DenseTable
        headers={[`Consumer`, `Status`, `Profile`, `Docs`, `SLA`, `Assigned to`, `Updated`]}
        emptyMessage="No verification cases matched the current filters."
      >
        {items.length === 0
          ? null
          : items.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link href={withReturnTo(`/verification/${item.id}`, returnTo)}>{item.email}</Link>
                  <div className={monoMutedTextClass}>{item.id}</div>
                </td>
                <td>
                  <div>
                    <StatusPill status={item.verificationStatus} />
                  </div>
                  <div className={mutedTextClass}>{item.stripeIdentityStatus ?? EMPTY_VALUE}</div>
                </td>
                <td>
                  <div>{item.accountType}</div>
                  <div className={mutedTextClass}>{item.country ?? EMPTY_VALUE}</div>
                  <div className={mutedTextClass}>
                    {item.missingProfileData ? `Missing profile data` : `Profile ready`}
                  </div>
                </td>
                <td>{item.missingDocuments ? `Missing documents` : `${item.documentsCount} attached`}</td>
                <td>{item.slaBreached ? `Breached` : `Within SLA`}</td>
                <td>{renderVerificationAssignee(item)}</td>
                <td>{formatDateTime(item.updatedAt)}</td>
              </tr>
            ))}
      </DenseTable>
    );
  };
}

export function VerificationListView({ items, returnTo }: { items: VerificationItem[]; returnTo: string }) {
  return (
    <RenderQueueView
      items={items}
      emptyMessage="No verification cases matched the current filters."
      emptyClassName={emptyPanelClass}
      renderMobileItem={renderMobileVerification(returnTo)}
      renderTabletItem={renderTabletVerification(returnTo)}
      renderDesktopContent={renderDesktopVerifications(returnTo)}
    />
  );
}
